/**
 * Limites de execução do dispatch, ajustáveis por ambiente.
 *
 * Os padrões são exatamente os números que sempre estiveram no código.
 * Existem como variável porque a instância de produção precisa de outros:
 * agente que trabalha meia hora não pode morrer aos dez minutos, e tarefa
 * que falha não deve ser retentada cinco vezes. Sem isso, aquela máquina
 * era obrigada a manter um diff local para sempre — e qualquer `git pull`
 * silenciosamente devolvia os valores de fábrica.
 *
 * Módulo separado de propósito: `task-dispatch.ts` está fora da cobertura
 * de testes (precisa de banco e processo vivos), e estes limites merecem
 * teste próprio.
 */

/**
 * Inteiro positivo vindo do ambiente. Valor ausente, não numérico, zero ou
 * negativo cai no padrão: erro de digitação no .env não pode derrubar a fila
 * nem virar `NaN` dentro de um `setTimeout`.
 */
export function envPositiveInt(nome: string, padrao: number): number {
  const bruto = (process.env[nome] ?? '').trim()
  if (!bruto) return padrao
  const n = Number(bruto)
  if (!Number.isFinite(n) || n <= 0) {
    console.warn(`[dispatch-limits] ${nome}="${bruto}" inválido; usando ${padrao}`)
    return padrao
  }
  return Math.floor(n)
}

/** Tempo máximo de uma chamada ao Claude CLI, em ms. */
export const claudeCliTimeoutMs = (): number =>
  envPositiveInt('MC_CLAUDE_CLI_TIMEOUT_MS', 600_000)

/** Tempo máximo de uma chamada ao Codex CLI, em ms. */
export const codexCliTimeoutMs = (): number =>
  envPositiveInt('MC_CODEX_CLI_TIMEOUT_MS', 300_000)

/** Quantas vezes uma tarefa é reenviada antes de ser marcada como falha. */
export const maxDispatchRetries = (): number =>
  envPositiveInt('MC_MAX_DISPATCH_RETRIES', 5)
