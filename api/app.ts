import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import './database.js'
import templateRoutes from './routes/templates.js'
import executeRoutes from './routes/execute.js'
import historyRoutes from './routes/history.js'
import uploadRoutes from './routes/upload.js'
import imageRoutes from './routes/images.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/data/uploads', express.static(path.join(process.cwd(), 'data', 'uploads')))

app.use(templateRoutes)
app.use(executeRoutes)
app.use(historyRoutes)
app.use(uploadRoutes)
app.use(imageRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: 'ok',
    })
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({
    success: false,
    error: 'Server internal error',
  })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'API not found',
  })
})

export default app
