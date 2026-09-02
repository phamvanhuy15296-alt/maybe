const HIGH_RISK_PATTERN = /(?:\b(?:kill|murder|suicide|self[- ]?harm|hurt (?:myself|someone))\b|想杀人|杀死(?:自己|别人|他人)|自杀|伤害(?:自己|别人|他人)|弄死(?:自己|别人|他人))/i;

export async function registerWebMCP(api) {
  if (!document.modelContext?.registerTool) {
    return { supported: false, registered: [] };
  }

  const tools = [
    {
      name: 'maybe_respond_in_page',
      title: 'Quick-answer or decide in Maybe',
      description:
        'Default first action for ordinary, self-contained questions while Maybe is open. Do not research: answer immediately, or provide 2-6 mutually exclusive choices and set autoRoll when the user wants a decision now. Returns the page state or settled winner; rejects urgent-safety, high-stakes, current-fact, code, and external-action tasks.',
      inputSchema: {
        type: 'object',
        properties: {
          question: { type: 'string', minLength: 1, maxLength: 240 },
          kind: { type: 'string', enum: ['decision', 'answer'] },
          message: {
            type: 'string',
            maxLength: 1000,
            description: 'Required for an answer; optional short setup for a decision.',
          },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: { type: 'string', minLength: 1, maxLength: 80 },
            description: 'Required for a decision; omit for an answer.',
          },
          autoRoll: {
            type: 'boolean',
            default: false,
            description: 'For decisions, roll immediately when the user asks Maybe to choose now.',
          },
          diceCount: {
            type: 'integer',
            minimum: 1,
            maximum: 5,
            description: 'Optional visible dice count for this and future rolls.',
          },
        },
        required: ['question', 'kind'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      execute: async ({ question, kind, message = '', options = [], autoRoll = false, diceCount }) => {
        if (HIGH_RISK_PATTERN.test(String(question))) {
          throw new Error('Use the normal Codex safety workflow for this question.');
        }
        if (diceCount !== undefined) api.setDiceCount(diceCount);
        const state = api.respondInPage({ question, kind, message, options });
        if (kind === 'decision' && autoRoll) {
          const result = await api.roll();
          return { ...result, step: 'result', rolled: true };
        }
        return { ...state, rolled: false };
      },
    },
    {
      name: 'maybe_get_pending_question',
      title: 'Read the question in Maybe',
      description: 'Read the question typed in Maybe. For an ordinary prompt, immediately call maybe_respond_in_page without research or a follow-up.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      execute: async () => api.getContext(),
    },
    {
      name: 'maybe_get_state',
      title: 'Read Maybe state',
      description: 'Return the current question, choices, face mapping, dice count, score, and UI step.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      execute: async () => api.getState(),
    },
    {
      name: 'maybe_configure_dice',
      title: 'Configure Maybe dice',
      description: 'Set the visible dice count and/or six-face choice mapping. Returns the updated state; mapping entries are zero-based choice indices.',
      inputSchema: {
        type: 'object',
        minProperties: 1,
        properties: {
          count: { type: 'integer', minimum: 1, maximum: 5 },
          mapping: {
            type: 'array',
            minItems: 6,
            maxItems: 6,
            items: { type: 'integer', minimum: 0, maximum: 5 },
          },
        },
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      execute: async ({ count, mapping }) => {
        if (count !== undefined) api.setDiceCount(count);
        if (mapping !== undefined) api.setMapping(mapping);
        return api.getState();
      },
    },
    {
      name: 'maybe_roll',
      title: 'Roll the Maybe dice now',
      description: 'Roll using the current choices and return settled faces, votes, and winner. Fails when fewer than two choices are ready.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
      execute: async () => api.roll(),
    },
    {
      name: 'maybe_get_history',
      title: 'Read Maybe history',
      description: 'Return recent locally saved questions, answers, faces, and winners.',
      inputSchema: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 30, default: 10 } },
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      execute: async ({ limit = 10 } = {}) => api.getHistory(limit),
    },
    {
      name: 'maybe_list_question_cards',
      title: 'Browse the Maybe question shelf',
      description: 'List reusable built-in and personal cards. Search before creating a duplicate.',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: ['all', 'office', 'daily', 'work', 'coding', 'humor', 'creative', 'personal'], default: 'all' },
          source: { type: 'string', enum: ['all', 'built-in', 'custom'], default: 'all' },
          query: { type: 'string', maxLength: 100 },
        },
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      execute: async (filters = {}) => api.getQuestionCards(filters),
    },
    {
      name: 'maybe_save_question_cards',
      title: 'Save cards to the Maybe shelf',
      description: 'Save 1-20 reusable cards locally. Each needs one lively question and 2-6 mutually exclusive answers; append unless replacement was explicitly requested.',
      inputSchema: {
        type: 'object',
        properties: {
          mode: { type: 'string', enum: ['append', 'replace'], default: 'append' },
          cards: {
            type: 'array',
            minItems: 1,
            maxItems: 20,
            items: {
              type: 'object',
              properties: {
                question: { type: 'string', minLength: 1, maxLength: 180 },
                message: { type: 'string', maxLength: 240 },
                category: { type: 'string', enum: ['office', 'daily', 'work', 'coding', 'humor', 'creative', 'personal'], default: 'personal' },
                options: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 6,
                  items: { type: 'string', minLength: 1, maxLength: 80 },
                },
              },
              required: ['question', 'options'],
            },
          },
        },
        required: ['cards'],
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
      execute: async ({ cards, mode = 'append' }) => api.saveQuestionCards(cards, { mode }),
    },
    {
      name: 'maybe_open_question_card',
      title: 'Open a Maybe question card',
      description: 'Load one shelf card by id into the editable decision flow. Returns the resulting page state.',
      inputSchema: {
        type: 'object',
        properties: { id: { type: 'string', minLength: 1, maxLength: 72 } },
        required: ['id'],
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
      execute: async ({ id }) => api.useQuestionCard(id),
    },
  ];

  const registered = [];
  for (const tool of tools) {
    try {
      await document.modelContext.registerTool(tool);
      registered.push(tool.name);
    } catch (error) {
      console.warn(`[Maybe] Could not register ${tool.name}`, error);
    }
  }

  return { supported: true, registered };
}
