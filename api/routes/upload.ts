import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const uploadDir = path.join(process.cwd(), 'data', 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, uuidv4() + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

const router = Router()

router.post('/api/upload', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file provided' })
    return
  }

  const id = uuidv4()
  const { originalname, filename, path: filepath, mimetype, size } = req.file

  db.prepare(
    'INSERT INTO uploaded_images (id, filename, filepath, mimetype, size) VALUES (?, ?, ?, ?, ?)'
  ).run(id, originalname, filepath, mimetype, size)

  res.json({
    success: true,
    data: {
      id,
      filename: originalname,
      filepath,
      url: `/api/images/${id}`,
    },
  })
})

export default router
