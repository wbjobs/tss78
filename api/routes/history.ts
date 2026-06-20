import { Router, type Request, type Response } from 'express'
import db from '../database.js'

const router = Router()

router.get('/api/history', (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20
  const search = (req.query.search as string) || ''
  const offset = (page - 1) * limit

  let countQuery = 'SELECT COUNT(*) as total FROM execution_records'
  let dataQuery = 'SELECT * FROM execution_records'
  const params: any[] = []

  if (search) {
    countQuery += ' WHERE template_content LIKE ? OR result LIKE ? OR model LIKE ?'
    dataQuery += ' WHERE template_content LIKE ? OR result LIKE ? OR model LIKE ?'
    const like = `%${search}%`
    params.push(like, like, like)
  }

  dataQuery += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'

  const totalRow = db.prepare(countQuery).get(...params) as any
  const rows = db.prepare(dataQuery).all(...params, limit, offset)

  const records = rows.map((row: any) => ({
    id: row.id,
    templateId: row.template_id,
    templateContent: row.template_content,
    variables: JSON.parse(row.variables_json),
    images: JSON.parse(row.images_json),
    model: row.model,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    result: row.result,
    tokensUsed: row.tokens_used,
    duration: row.duration,
    createdAt: row.created_at,
  }))

  res.json({
    success: true,
    data: {
      records,
      pagination: {
        page,
        limit,
        total: totalRow.total,
        totalPages: Math.ceil(totalRow.total / limit),
      },
    },
  })
})

router.get('/api/history/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM execution_records WHERE id = ?').get(id) as any
  if (!row) {
    res.status(404).json({ success: false, error: 'Record not found' })
    return
  }
  res.json({
    success: true,
    data: {
      id: row.id,
      templateId: row.template_id,
      templateContent: row.template_content,
      variables: JSON.parse(row.variables_json),
      images: JSON.parse(row.images_json),
      model: row.model,
      temperature: row.temperature,
      maxTokens: row.max_tokens,
      result: row.result,
      tokensUsed: row.tokens_used,
      duration: row.duration,
      createdAt: row.created_at,
    },
  })
})

export default router
