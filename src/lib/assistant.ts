/**
 * The Bauan Assistant panel.
 *
 * One network call, and only after the reader presses Send. The key lives in
 * the Vercel function; nothing here can see it. Messages stay in memory. Voice
 * input uses the browser's SpeechRecognition, voice output uses
 * speechSynthesis — both are optional and both are cancelled when the panel
 * closes.
 */

type ChatMessage = { role: 'user' | 'assistant'; content: string };

type SpeechResult = { isFinal: boolean; [index: number]: { transcript: string } };
type SpeechResultEvent = { resultIndex: number; results: ArrayLike<SpeechResult> };
type SpeechErrorEvent = { error: string };

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  addEventListener(type: 'start' | 'end', listener: (event: Event) => void): void;
  addEventListener(type: 'result', listener: (event: SpeechResultEvent) => void): void;
  addEventListener(type: 'error', listener: (event: SpeechErrorEvent) => void): void;
};

type RecognitionConstructor = new () => RecognitionLike;

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initAssistant() {
  const root = document.querySelector<HTMLElement>('[data-assistant]');
  if (!root) return;

  const panel = root.querySelector<HTMLElement>('[data-assistant-panel]');
  const openers = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-assistant-open]'));
  const closeButton = root.querySelector<HTMLButtonElement>('[data-assistant-close]');
  const form = root.querySelector<HTMLFormElement>('[data-assistant-form]');
  const input = root.querySelector<HTMLTextAreaElement>('[data-assistant-input]');
  const messagesHost = root.querySelector<HTMLElement>('[data-assistant-messages]');
  const chips = root.querySelector<HTMLElement>('[data-assistant-chips]');
  const status = root.querySelector<HTMLElement>('[data-assistant-status]');
  const send = root.querySelector<HTMLButtonElement>('[data-assistant-send]');
  const sendLabel = root.querySelector<HTMLElement>('[data-assistant-send-label]');
  const mic = root.querySelector<HTMLButtonElement>('[data-assistant-mic]');
  const voice = root.querySelector<HTMLButtonElement>('[data-assistant-voice]');
  const language = root.querySelector<HTMLSelectElement>('[data-assistant-lang]');
  const hint = root.querySelector<HTMLElement>('[data-assistant-hint]');
  const fallback = root.querySelector<HTMLElement>('[data-bot-fallback]');
  const welcome = root.querySelector<HTMLElement>('[data-assistant-welcome]');
  const backdrop = root.querySelector<HTMLElement>('[data-assistant-backdrop]');

  if (!panel || !form || !input || !messagesHost || !send) return;

  const history: ChatMessage[] = [];
  let streaming = false;
  let controller: AbortController | null = null;
  let voiceOn = false;
  let lastFocus: HTMLElement | null = null;
  let started = false;

  const setStatus = (text: string) => {
    if (status) status.textContent = text;
  };

  const scrollMessages = () => {
    messagesHost.scrollTop = messagesHost.scrollHeight;
  };

  const setStreaming = (value: boolean) => {
    streaming = value;
    send.setAttribute('aria-busy', String(value));
    send.setAttribute('aria-label', value ? 'Stop the answer' : 'Send question');
    if (sendLabel) sendLabel.textContent = value ? 'Stop' : 'Send';
    messagesHost.setAttribute('aria-busy', String(value));
  };

  const setOpen = (open: boolean) => {
    if (open) {
      lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      panel.hidden = false;
      if (backdrop) backdrop.hidden = false;
      root.setAttribute('data-open', '');
      document.documentElement.classList.add('assistant-open');
      hint?.classList.add('is-hidden');
      for (const opener of openers) opener.setAttribute('aria-expanded', 'true');
      window.requestAnimationFrame(() => {
        panel.classList.add('is-open');
        // Do not steal focus on touch devices, where the keyboard would cover
        // the welcome message before the reader has seen it.
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) input.focus();
      });
    } else {
      panel.classList.remove('is-open');
      panel.hidden = true;
      if (backdrop) backdrop.hidden = true;
      root.removeAttribute('data-open');
      document.documentElement.classList.remove('assistant-open');
      for (const opener of openers) opener.setAttribute('aria-expanded', 'false');
      controller?.abort();
      window.speechSynthesis?.cancel();
      lastFocus?.focus();
    }
  };

  for (const opener of openers) {
    opener.addEventListener('click', () => setOpen(panel.hidden !== false));
  }

  closeButton?.addEventListener('click', () => setOpen(false));
  backdrop?.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  // Keep keyboard focus inside the dialog while it is open.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || panel.hidden) return;
    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // A modest welcome hint, not a modal. It disappears for good on first open.
  if (hint) {
    const showHint = () => hint.classList.add('is-visible');
    if (reduce) {
      showHint();
    } else {
      window.setTimeout(showHint, 4200);
    }
  }

  const addMessage = (role: 'user' | 'assistant', text = '') => {
    const item = document.createElement('div');
    item.className = `assistant-msg assistant-msg-${role === 'assistant' ? 'bot' : 'user'}`;
    if (role === 'assistant') item.dataset.assistantAnswer = '';
    const body = document.createElement('p');
    body.className = 'assistant-msg-text';
    body.textContent = text;
    item.appendChild(body);
    messagesHost.appendChild(item);
    scrollMessages();
    return { item, body };
  };

  const addTyping = () => {
    const { item, body } = addMessage('assistant');
    item.dataset.typing = '';
    const dots = document.createElement('span');
    dots.className = 'assistant-typing';
    dots.setAttribute('aria-label', 'Thinking');
    dots.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(dots);
    return { item, body, dots };
  };

  const displayText = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1').replace(/`/g, '');

  const speak = (text: string) => {
    if (!voiceOn || !('speechSynthesis' in window)) return;
    const clean = displayText(text).replace(/[*_#`>]/g, '').replace(/\s+\n/g, '\n').trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    const filipino = /\b(ang|ng|mga|sa|ay|hindi|po|opo|salamat|kung|para|si|ni|bakit|ano|sino|mayor|bayan)\b/i.test(clean);
    utterance.lang = filipino ? 'fil-PH' : 'en-PH';
    utterance.rate = 1.02;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const readError = async (response: Response) => {
    if (response.status === 404) {
      return 'The assistant is not connected on this preview. The record is still on /government, /map and /projects.';
    }
    try {
      const data = await response.json();
      return data?.error || `The assistant returned ${response.status}.`;
    } catch {
      return `The assistant returned ${response.status}.`;
    }
  };

  const sendQuestion = async (raw: string) => {
    const question = raw.trim();
    if (!question) return;

    // While an answer is streaming the send control becomes Stop.
    if (streaming) {
      controller?.abort();
      return;
    }

    setOpen(true);
    input.value = '';
    resizeInput();
    if (welcome) welcome.hidden = true;
    if (chips) chips.hidden = true;
    root.setAttribute('data-started', '');
    started = true;

    addMessage('user', question);
    history.push({ role: 'user', content: question });
    const { item, body, dots } = addTyping();

    controller = new AbortController();
    setStreaming(true);
    setStatus('Reading the record…');

    let answer = '';
    let received = false;

    const replaceDots = () => {
      if (received) return;
      received = true;
      dots.remove();
      body.textContent = '';
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: history.slice(-8),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await readError(response);
        replaceDots();
        body.textContent = message;
        setStatus('');
        return;
      }

      const type = response.headers.get('content-type') || '';

      if (type.includes('application/json')) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || data?.content || '';
        replaceDots();
        answer = text || 'The assistant returned an empty answer.';
        body.textContent = displayText(answer);
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

          let split = buffer.indexOf('\n\n');
          while (split >= 0) {
            const chunk = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (!payload || payload === '[DONE]') continue;
              try {
                const data = JSON.parse(payload);
                const delta = data?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta) {
                  replaceDots();
                  answer += delta;
                  body.textContent = displayText(answer);
                  scrollMessages();
                }
              } catch {
                /* usage and keep-alive lines are ignored */
              }
            }
            split = buffer.indexOf('\n\n');
          }
        }
      }

      if (!answer) {
        replaceDots();
        body.textContent = 'The assistant did not return an answer. Try a shorter question.';
      } else {
        history.push({ role: 'assistant', content: answer });
        speak(answer);
      }
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        replaceDots();
        body.textContent = answer ? displayText(answer) : 'Stopped.';
        setStatus('Stopped.');
      } else {
        replaceDots();
        body.textContent =
          'The assistant could not connect. The record is still on /government, /map and /projects.';
        setStatus('');
      }
    } finally {
      setStreaming(false);
      controller = null;
      if (started) setStatus('');
      scrollMessages();
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) input.focus();
      // Drop the empty assistant shell left by a network failure.
      if (!body.textContent) item.remove();
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void sendQuestion(input.value);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendQuestion(input.value);
    }
  });

  for (const chip of root.querySelectorAll<HTMLButtonElement>('[data-assistant-prompt]')) {
    chip.addEventListener('click', () => void sendQuestion(chip.dataset.assistantPrompt || ''));
  }

  const resizeInput = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(132, input.scrollHeight)}px`;
  };
  input.addEventListener('input', resizeInput);
  resizeInput();

  /* Voice output ---------------------------------------------------- */

  voice?.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voice.setAttribute('aria-pressed', String(voiceOn));
    voice.setAttribute('aria-label', voiceOn ? 'Turn off spoken replies' : 'Read replies aloud');
    if (!voiceOn) window.speechSynthesis?.cancel();
  });

  if (!('speechSynthesis' in window)) {
    if (voice) {
      voice.disabled = true;
      voice.title = 'Spoken replies are not supported by this browser.';
    }
  }

  /* Voice input ----------------------------------------------------- */

  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

  let recognition: RecognitionLike | null = null;
  let listening = false;
  let voiceFinal = '';
  let voiceSent = false;

  if (!Recognition) {
    if (mic) {
      mic.disabled = true;
      mic.title = 'Voice input is not supported by this browser. Type instead.';
    }
  } else if (mic) {
    recognition = new Recognition();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('start', () => {
      listening = true;
      voiceFinal = '';
      voiceSent = false;
      mic.setAttribute('aria-pressed', 'true');
      root.setAttribute('data-listening', '');
      setStatus('Listening… speak now.');
      if (chips) chips.hidden = true;
    });

    recognition.addEventListener('result', (event: SpeechResultEvent) => {
      let interim = '';
      let final = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? '';
        if (event.results[index].isFinal) final += transcript;
        else interim += transcript;
      }
      if (final) voiceFinal = final.trim();
      input.value = `${voiceFinal} ${interim}`.trim();
      resizeInput();
    });

    recognition.addEventListener('end', () => {
      listening = false;
      mic.setAttribute('aria-pressed', 'false');
      root.removeAttribute('data-listening');
      setStatus('');
      if (voiceFinal && !voiceSent) {
        voiceSent = true;
        void sendQuestion(voiceFinal);
      }
    });

    recognition.addEventListener('error', (event: SpeechErrorEvent) => {
      listening = false;
      mic.setAttribute('aria-pressed', 'false');
      root.removeAttribute('data-listening');
      setStatus(
        event.error === 'not-allowed'
          ? 'Microphone permission was blocked. Type your question instead.'
          : 'Voice input stopped. Type your question instead.'
      );
    });

    mic.addEventListener('click', () => {
      if (listening) {
        recognition?.stop();
        return;
      }
      recognition!.lang = language?.value || 'en-PH';
      try {
        recognition!.start();
      } catch {
        setStatus('The microphone is already starting. Try again.');
      }
    });
  }

  /* Bot fallback ---------------------------------------------------- */

  // The three.js launcher replaces this SVG when its canvas is ready. If WebGL
  // is unavailable, the SVG remains and the panel still works.
  window.addEventListener('bb:botready', () => {
    fallback?.classList.add('is-hidden');
  });
}
