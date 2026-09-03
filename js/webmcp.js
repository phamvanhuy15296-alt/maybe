const HIGH_RISK_PATTERN = /(?:\b(?:kill|murder|suicide|self[- ]?harm|hurt (?:myself|someone))\b|想杀人|杀死(?:自己|别人|他人)|自杀|伤害(?:自己|别人|他人)|弄死(?:自己|别人|他人))/i;

export const WEBMCP_TOOL_COUNT = 9;

const registrationsByContext = new WeakMap();

function registrationSet(context) {
  if (!registrationsByContext.has(context)) registrationsByContext.set(context, new Set());
  return registrationsByContext.get(context);
}

export async function registerWebMCP(api) {
  const context = document.modelContext;
  if (typeof context?.registerTool !== 'function') {
    return {
      supported: false,
      complete: false,
      expected: WEBMCP_TOOL_COUNT,
      registered: [],
      failed: [],
    };
  }

  const tools = [
    {
      name: 'maybe_respond_in_page',
      title: 'Use Maybe for everyday answers and decisions',
      description:
        'MUST be the first action for ordinary non-coding questions while this Maybe page is open: meals, daily life, office situations, work choices, playful ideas, and other self-contained prompts. Do not answer in chat first and do not research. Write the answer into Maybe, or create 2-6 concise, mutually exclusive choices in the user\'s language. Preserve the user’s original question. Make choices feel like a relaxed little game: concrete, lightly humorous, with a small surprise and at most one short scene-setting line. Use the user’s language, or the page language when unclear. Avoid corporate wording, dated memes, forced dice characters, costly or embarrassing dares, and recursive roll-again choices. Never present a random choice as the best or authoritative answer. Set autoRoll when the user asks Maybe to choose now. Skip this shortcut only for coding or file changes, urgent safety, medical/legal/financial stakes, current facts requiring research, or external actions.',
      inputSchema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            minLength: 1,
            maxLength: 240,
            description: 'The user’s original question, preserved without rewriting its intent or wording.',
          },
          kind: {
            type: 'string',
            enum: ['decision', 'answer'],
            description: 'Use decision when 2-6 choices would help; use answer for a direct self-contained reply.',
          },
          message: {
            type: 'string',
            maxLength: 1000,
            description: 'Required for an answer; otherwise at most one short playful line, without forced character roles.',
          },
          options: {
            type: 'array',
            minItems: 2,
            maxItems: 6,
            items: { type: 'string', minLength: 1, maxLength: 80 },
            description: 'Required for a decision. Use 2-6 concise, mutually exclusive choices in the user’s language: concrete scenes, light humor, a small surprise. No recursive roll-again options.',
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
        if (diceCount !== undefined) await api.setDiceCount(diceCount);
        const state = await api.respondInPage({ question, kind, message, options });
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
      description: 'Read the question typed in Maybe. For an ordinary non-coding prompt, immediately call maybe_respond_in_page without research or a chat-only answer; preserve the original question and make its choices concrete, mutually exclusive, and gently playful, without corporate language or forced characters.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
      execute: async () => api.getContext(),
    },
    {
      name: 'maybe_get_state',
      title: 'Read Maybe state',
      description: 'Return the current question, choices, face mapping, dice count, score, and UI step.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
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
        if (count !== undefined) await api.setDiceCount(count);
        if (mapping !== undefined) await api.setMapping(mapping);
        return api.getState();
      },
    },
    {
      name: 'maybe_roll',
      title: 'Roll the Maybe dice now',
      description: 'Roll using the current choices and return settled faces, votes, and winner. Fails when fewer than two choices are ready.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
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
      description: 'Save 1-20 reusable cards locally. Keep supplied questions unchanged. For new cards, use everyday scenes, light humor, and a small surprise, with 2-6 concise, mutually exclusive choices. Avoid corporate language, forced characters, costly or embarrassing dares, recursive roll-again choices, and high-stakes topics. Use the user’s language, or the page language when unclear; append unless replacement was explicitly requested.',
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

  const registeredNames = registrationSet(context);
  const failed = [];
  for (const tool of tools) {
    if (registeredNames.has(tool.name)) continue;
    try {
      await context.registerTool(tool);
      registeredNames.add(tool.name);
    } catch (error) {
      console.warn(`[Maybe] Could not register ${tool.name}`, error);
      failed.push({ name: tool.name, message: String(error?.message || error) });
    }
  }

  const registered = tools.map(({ name }) => name).filter((name) => registeredNames.has(name));
  return {
    supported: true,
    complete: registered.length === tools.length,
    expected: tools.length,
    registered,
    failed,
  };
}
