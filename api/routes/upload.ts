import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const uploadDir = path.join(process.cwd(), 'data', 'uploads')
const chunksDir = path.join(process.cwd(), 'data', 'chunks')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}
if (!fs.existsSync(chunksDir)) {
  fs.mkdirSync(chunksDir, { recursive: true })
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const CHUNK_SIZE = 2 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']

const errorCodes = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_TYPE: 'INVALID_TYPE',
  NO_FILE: 'NO_FILE',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  INVALID_CHUNK: 'INVALID_CHUNK',
  MERGE_FAILED: 'MERGE_FAILED',
  UPLOAD_ERROR: 'UPLOAD_ERROR',
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
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true)
    } else {
      cb(new MulterError('INVALID_TYPE', 'Only image files are allowed'))
    }
  },
})

class MulterError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = 'MulterError'
  }
}

const chunkStorage = multer.memoryStorage()
const chunkUpload = multer({
  storage: chunkStorage,
  limits: { fileSize: CHUNK_SIZE + 1024 },
})

const router = Router()

function getFileSizeLimit() {
  return MAX_FILE_SIZE
}

router.get('/api/upload/config', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      maxFileSize: MAX_FILE_SIZE,
      chunkSize: CHUNK_SIZE,
      allowedExtensions: ALLOWED_EXTENSIONS,
      threshold: CHUNK_SIZE,
    },
  })
})

router.post('/api/upload/init', (req: Request, res: Response) => {
  const { filename, mimeType, totalSize, totalChunks } = req.body

  if (!filename || !mimeType || !totalSize || !totalChunks) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields',
      errorCode: 'NO_FILE',
    })
    return
  }

  if (totalSize > MAX_FILE_SIZE) {
    res.status(413).json({
      success: false,
      error: `文件大小超过限制，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      errorCode: errorCodes.FILE_TOO_LARGE,
      maxSize: MAX_FILE_SIZE,
      fileSize: totalSize,
    })
    return
  }

  const ext = path.extname(filename).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    res.status(400).json({
      success: false,
      error: '不支持的文件类型',
      errorCode: errorCodes.INVALID_TYPE,
      allowedTypes: ALLOWED_EXTENSIONS,
    })
    return
  }

  const id = uuidv4()
  const sessionDir = path.join(chunksDir, id)
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }

  db.prepare(
    'INSERT INTO upload_sessions (id, filename, mimetype, total_size, total_chunks, status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, filename, mimeType, totalSize, totalChunks, 'pending')

  res.json({
    success: true,
    data: {
      uploadId: id,
      chunkSize: CHUNK_SIZE,
      totalChunks,
    },
  })
})

router.post('/api/upload/chunk', chunkUpload.single('chunk'), (req: Request, res: Response) => {
  const uploadId = req.body.uploadId
  const chunkIndex = parseInt(req.body.chunkIndex)

  if (!uploadId || isNaN(chunkIndex) || !req.file) {
    res.status(400).json({
      success: false,
      error: '缺少必要参数',
      errorCode: errorCodes.INVALID_CHUNK,
    })
    return
  }

  const session = db.prepare('SELECT * FROM upload_sessions WHERE id = ?').get(uploadId) as any
  if (!session) {
    res.status(404).json({
      success: false,
      error: '上传会话不存在',
      errorCode: errorCodes.SESSION_NOT_FOUND,
    })
    return
  }

  if (session.status !== 'pending') {
    res.status(400).json({
      success: false,
      error: '上传会话状态异常',
      errorCode: errorCodes.UPLOAD_ERROR,
    })
    return
  }

  const sessionDir = path.join(chunksDir, uploadId)
  const chunkPath = path.join(sessionDir, `${chunkIndex}`)
  fs.writeFileSync(chunkPath, req.file.buffer)

  db.prepare(
    'UPDATE upload_sessions SET uploaded_chunks = uploaded_chunks + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(uploadId)

  const updated = db.prepare('SELECT uploaded_chunks, total_chunks FROM upload_sessions WHERE id = ?').get(uploadId) as any
  const progress = Math.round((updated.uploaded_chunks / updated.total_chunks) * 100)

  res.json({
    success: true,
    data: {
      uploadId,
      chunkIndex,
      uploadedChunks: updated.uploaded_chunks,
      totalChunks: updated.total_chunks,
      progress,
    },
  })
})

router.post('/api/upload/complete', (req: Request, res: Response) => {
  const { uploadId } = req.body

  if (!uploadId) {
    res.status(400).json({
      success: false,
      error: '缺少 uploadId',
      errorCode: errorCodes.INVALID_CHUNK,
    })
    return
  }

  const session = db.prepare('SELECT * FROM upload_sessions WHERE id = ?').get(uploadId) as any
  if (!session) {
    res.status(404).json({
      success: false,
      error: '上传会话不存在',
      errorCode: errorCodes.SESSION_NOT_FOUND,
    })
    return
  }

  const sessionDir = path.join(chunksDir, uploadId)
  const ext = path.extname(session.filename).toLowerCase()
  const finalFilename = uuidv4() + ext
  const finalPath = path.join(uploadDir, finalFilename)

  try {
    const writeStream = fs.createWriteStream(finalPath)
    for (let i = 0; i < session.total_chunks; i++) {
      const chunkPath = path.join(sessionDir, `${i}`)
      if (!fs.existsSync(chunkPath)) {
        writeStream.close()
        res.status(400).json({
          success: false,
          error: `分片 ${i} 缺失`,
          errorCode: errorCodes.MERGE_FAILED,
        })
        return
      }
      const chunkData = fs.readFileSync(chunkPath)
      writeStream.write(chunkData)
    }
    writeStream.end()

    const fileStats = fs.statSync(finalPath)

    const imageId = uuidv4()
    db.prepare(
      'INSERT INTO uploaded_images (id, filename, filepath, mimetype, size) VALUES (?, ?, ?, ?, ?)'
    ).run(imageId, session.filename, finalPath, session.mimetype, fileStats.size)

    db.prepare("UPDATE upload_sessions SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(uploadId)

    fs.rm(sessionDir, { recursive: true, force: true }, () => {})

    res.json({
      success: true,
      data: {
        id: imageId,
        filename: session.filename,
        filepath: finalPath,
        url: `/api/images/${imageId}`,
        size: fileStats.size,
      },
    })
  } catch (err) {
    if (fs.existsSync(finalPath)) {
      fs.unlinkSync(finalPath)
    }
    res.status(500).json({
      success: false,
      error: '文件合并失败',
      errorCode: errorCodes.MERGE_FAILED,
    })
  }
})

router.post('/api/upload', (req: Request, res: Response) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({
          success: false,
          error: `文件大小超过限制，最大支持 ${MAX_FILE_SIZE / 1024 / 1024}MB`,
          errorCode: errorCodes.FILE_TOO_LARGE,
          maxSize: MAX_FILE_SIZE,
        })
        return
      }
      if (err.code === 'INVALID_TYPE') {
        res.status(400).json({
          success: false,
          error: '不支持的文件类型，仅支持 ' + ALLOWED_EXTENSIONS.join(', '),
          errorCode: errorCodes.INVALID_TYPE,
          allowedTypes: ALLOWED_EXTENSIONS,
        })
        return
      }
      res.status(500).json({
        success: false,
        error: err.message || '上传失败',
        errorCode: errorCodes.UPLOAD_ERROR,
      })
      return
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: '请选择要上传的文件',
        errorCode: errorCodes.NO_FILE,
      })
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
        size,
      },
    })
  })
})

export default router
