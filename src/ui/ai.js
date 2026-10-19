// AI 상담: Anthropic 공식 SDK(브라우저 빌드)로 Claude에게 질문한다.
// 서버가 없는 정적 사이트라 사용자가 자기 API 키를 넣고, 요청은 브라우저에서 Anthropic으로 바로 간다.
// 사주 보고서(SajuQA.buildReport)를 system에 넣어 그 내용만 근거로 답하게 한다.

(function (root) {
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.131.0/+esm';
  const MODEL = 'claude-opus-5-5';
  let sdk = null;
  const loadSdk = () => (sdk ||= import(SDK_URL).then(m => m.default));

  /*
   * history: 이전 대화 [{ role: 'user', content: 질문 }, { role: 'assistant', content: 이전 응답의 content 블록 그대로 }]
   * onText(snapshot): 답이 써지는 동안 지금까지의 글을 받는다
   * 반환: 완성된 응답 메시지 (history에 content를 그대로 이어 붙인다)
   */
  async function ask({ apiKey, report, history, question, onText, signal }) {
    const Anthropic = await loadSdk();
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: 'medium' },
      // 안전 분류기가 요청을 거절하면 Anthropic이 권장하는 다른 모델로 서버에서 다시 시도한다
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [
        { type: 'text', text: root.SajuQA.SYSTEM_PROMPT },
        // 보고서는 같은 사람·같은 날이면 그대로라 캐시해서 두 번째 질문부터 빠르고 싸게
        { type: 'text', text: `<saju_report>\n${report}\n</saju_report>`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [...history, { role: 'user', content: question }],
    }, { signal });
    stream.on('text', (_delta, snapshot) => onText(snapshot));
    return stream.finalMessage();
  }

  // 응답에서 사용자에게 보여 줄 글만 모은다
  function textOf(message) {
    return message.content.filter(b => b.type === 'text').map(b => b.text).join('\n\n');
  }

  async function errorMessage(err) {
    const Anthropic = await loadSdk().catch(() => null);
    if (!Anthropic) return 'AI 상담 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.';
    if (err instanceof Anthropic.APIUserAbortError) return '답변을 멈췄어요.';
    if (err instanceof Anthropic.AuthenticationError) return 'API 키가 올바르지 않아요. AI 상담 설정에서 키를 다시 확인해 주세요.';
    if (err instanceof Anthropic.PermissionDeniedError) return '이 API 키로는 이 모델을 쓸 권한이 없어요.';
    if (err instanceof Anthropic.RateLimitError) return '요청이 많아 잠시 제한됐어요. 조금 뒤에 다시 시도해 주세요.';
    if (err instanceof Anthropic.BadRequestError) return `요청이 거절됐어요: ${err.message}`;
    if (err instanceof Anthropic.InternalServerError) return 'Anthropic 서버에 일시적인 문제가 있어요. 잠시 뒤 다시 시도해 주세요.';
    if (err instanceof Anthropic.APIConnectionError) return '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.';
    if (err instanceof Anthropic.APIError) return `오류(${err.status}): ${err.message}`;
    return `알 수 없는 오류: ${err?.message || err}`;
  }

  root.SajuAI = { ask, textOf, errorMessage, MODEL };
})(window);
