import { Router, type Request, type Response } from 'express'
import path from 'path'
import fs from 'fs'
import db from '../database.js'

const router = Router()

router.get('/api/images/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const row = db.prepare('SELECT * FROM uploaded_images WHERE id = ?').get(id) as any
  if (!row) {
    res.status(404).json({ success: false, error: 'Image not found' })
    return
  }

  const filepath = row.filepath
  if (!fs.existsSync(filepath)) {
    res.status(404).json({ success: false, error: 'Image file not found on disk' })
    return
  }

  res.type(row.mimetype)
  res.sendFile(path.resolve(filepath))
})

export default router
