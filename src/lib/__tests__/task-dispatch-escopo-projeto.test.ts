import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { agentProjectScopeViolation } from '../task-dispatch'

/**
 * Escopo de projeto no despacho.
 *
 * A metade que importa testar é a do agente SEM associação: ela é o que torna a regra segura
 * de ligar num sistema que já roda. Se ela estiver errada, os 7 agentes de frota param de
 * receber tarefa no instante em que isto subir.
 */
describe('agentProjectScopeViolation', () => {
  let db: any

  beforeEach(() => {
    db = new Database(':memory:')
    db.exec(`
      CREATE TABLE projects (id INTEGER PRIMARY KEY, name TEXT, workspace_id INTEGER);
      CREATE TABLE project_agent_assignments (id INTEGER PRIMARY KEY, project_id INTEGER, agent_name TEXT, role TEXT);
      INSERT INTO projects (id, name, workspace_id) VALUES (4, 'Trievo 3D', 1), (2, 'Gestão de Obra', 1);
      INSERT INTO project_agent_assignments (project_id, agent_name, role) VALUES (4, 'instagram', 'trievo-3d');
    `)
  })

  it('deixa passar o agente SEM associação, em qualquer projeto', () => {
    // Os agentes de frota (dev, qa, analista) atuam em qualquer projeto de propósito.
    expect(agentProjectScopeViolation(db, 'dev', 4, 1)).toBeNull()
    expect(agentProjectScopeViolation(db, 'dev', 2, 1)).toBeNull()
    expect(agentProjectScopeViolation(db, 'dev', null, 1)).toBeNull()
  })

  it('deixa passar o agente associado no projeto dele', () => {
    expect(agentProjectScopeViolation(db, 'instagram', 4, 1)).toBeNull()
  })

  it('recusa o agente associado num projeto de outro', () => {
    const motivo = agentProjectScopeViolation(db, 'instagram', 2, 1)
    expect(motivo).toContain('instagram')
    expect(motivo).toContain('Trievo 3D') // diz a que ele pertence, não só que recusou
    expect(motivo).toContain('projeto 2')
  })

  it('recusa tarefa sem projeto quando o agente tem escopo', () => {
    // Deixar passar abriria um buraco: bastaria omitir o projeto para alcançar qualquer agente.
    const motivo = agentProjectScopeViolation(db, 'instagram', null, 1)
    expect(motivo).toContain('sem projeto')
  })

  it('aceita qualquer um dos projetos quando há mais de uma associação', () => {
    db.exec(`INSERT INTO project_agent_assignments (project_id, agent_name, role) VALUES (2, 'instagram', 'obra')`)
    expect(agentProjectScopeViolation(db, 'instagram', 4, 1)).toBeNull()
    expect(agentProjectScopeViolation(db, 'instagram', 2, 1)).toBeNull()
  })
})
