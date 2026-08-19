import { describe, it, expect, afterEach } from 'vitest'
import { claudeCliTimeoutMs, codexCliTimeoutMs, maxDispatchRetries } from './dispatch-limits'

const limpar = () => {
  delete process.env.MC_CLAUDE_CLI_TIMEOUT_MS
  delete process.env.MC_CODEX_CLI_TIMEOUT_MS
  delete process.env.MC_MAX_DISPATCH_RETRIES
}
afterEach(limpar)

describe('limites de execução por ambiente', () => {
  it('sem variável, mantém o que sempre esteve no código', () => {
    limpar()
    expect(claudeCliTimeoutMs()).toBe(600_000)
    expect(codexCliTimeoutMs()).toBe(300_000)
    expect(maxDispatchRetries()).toBe(5)
  })

  it('respeita o valor do ambiente', () => {
    process.env.MC_CLAUDE_CLI_TIMEOUT_MS = '1800000'
    process.env.MC_MAX_DISPATCH_RETRIES = '2'
    expect(claudeCliTimeoutMs()).toBe(1_800_000)
    expect(maxDispatchRetries()).toBe(2)
  })

  it('lê o valor a cada chamada, não no import', () => {
    // o .env é carregado pelo systemd antes do processo; ainda assim, um
    // valor trocado em runtime tem de valer sem reiniciar o módulo
    process.env.MC_MAX_DISPATCH_RETRIES = '3'
    expect(maxDispatchRetries()).toBe(3)
    process.env.MC_MAX_DISPATCH_RETRIES = '7'
    expect(maxDispatchRetries()).toBe(7)
  })

  it('valor inválido cai no padrão em vez de derrubar a fila', () => {
    for (const ruim of ['abc', '0', '-5', '', '   ']) {
      process.env.MC_MAX_DISPATCH_RETRIES = ruim
      expect(maxDispatchRetries()).toBe(5)
    }
  })

  it('decimal vira inteiro, não NaN no setTimeout', () => {
    process.env.MC_CLAUDE_CLI_TIMEOUT_MS = '1500.9'
    expect(claudeCliTimeoutMs()).toBe(1500)
  })

  it('espaço em volta não atrapalha — .env costuma trazer', () => {
    process.env.MC_CODEX_CLI_TIMEOUT_MS = '  450000  '
    expect(codexCliTimeoutMs()).toBe(450_000)
  })
})
