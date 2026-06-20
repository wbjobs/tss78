import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

function extractVariables(content: string): string[] {
  const vars: string[] = []
  const regex = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(content)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1])
    }
  }
  return vars
}

router.get('/api/templates', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM prompt_templates ORDER BY updated_at DESC').all()
  const templates = rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    content: row.content,
    variables: JSON.parse(row.variables_json),
    tags: JSON.parse(row.tags_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
  res.json({ success: true, data: templates })
})

router.post('/api/templates', (req: Request, res: Response) => {
  const { name, content, tags } = req.body
  if (!name || !content) {
    res.status(400).json({ success: false, error: 'name and content are required' })
    return
  }
  const id = uuidv4()
  const variables = extractVariables(content)
  const tagsArr = tags || []
  db.prepare(
    'INSERT INTO prompt_templates (id, name, content, variables_json, tags_json) VALUES (?, ?, ?, ?, ?)'
  ).run(id, name, content, JSON.stringify(variables), JSON.stringify(tagsArr))
  const row = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as any
  res.json({
    success: true,
    data: {
      id: row.id,
      name: row.name,
      content: row.content,
      variables: JSON.parse(row.variables_json),
      tags: JSON.parse(row.tags_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  })
})

router.put('/api/templates/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const { name, content, tags } = req.body
  const existing = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as any
  if (!existing) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  const newName = name ?? existing.name
  const newContent = content ?? existing.content
  const variables = content ? extractVariables(content) : JSON.parse(existing.variables_json)
  const tagsArr = tags !== undefined ? tags : JSON.parse(existing.tags_json)
  db.prepare(
    'UPDATE prompt_templates SET name = ?, content = ?, variables_json = ?, tags_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(newName, newContent, JSON.stringify(variables), JSON.stringify(tagsArr), id)
  const row = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as any
  res.json({
    success: true,
    data: {
      id: row.id,
      name: row.name,
      content: row.content,
      variables: JSON.parse(row.variables_json),
      tags: JSON.parse(row.tags_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    },
  })
})

router.delete('/api/templates/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const result = db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id)
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  res.json({ success: true })
})

router.get('/api/templates/:id/variable-sets', (req: Request, res: Response) => {
  const { id } = req.params
  const rows = db.prepare('SELECT * FROM variable_sets WHERE template_id = ? ORDER BY created_at DESC').all(id)
  const sets = rows.map((row: any) => ({
    id: row.id,
    templateId: row.template_id,
    name: row.name,
    values: JSON.parse(row.values_json),
    createdAt: row.created_at,
  }))
  res.json({ success: true, data: sets })
})

router.post('/api/templates/:id/variable-sets', (req: Request, res: Response) => {
  const { id } = req.params
  const { name, values } = req.body
  if (!name) {
    res.status(400).json({ success: false, error: 'name is required' })
    return
  }
  const template = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(id) as any
  if (!template) {
    res.status(404).json({ success: false, error: 'Template not found' })
    return
  }
  const setId = uuidv4()
  const valuesObj = values || {}
  db.prepare(
    'INSERT INTO variable_sets (id, template_id, name, values_json) VALUES (?, ?, ?, ?)'
  ).run(setId, id, name, JSON.stringify(valuesObj))
  const row = db.prepare('SELECT * FROM variable_sets WHERE id = ?').get(setId) as any
  res.json({
    success: true,
    data: {
      id: row.id,
      templateId: row.template_id,
      name: row.name,
      values: JSON.parse(row.values_json),
      createdAt: row.created_at,
    },
  })
})

router.delete('/api/variable-sets/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const result = db.prepare('DELETE FROM variable_sets WHERE id = ?').run(id)
  if (result.changes === 0) {
    res.status(404).json({ success: false, error: 'Variable set not found' })
    return
  }
  res.json({ success: true })
})

export default router
