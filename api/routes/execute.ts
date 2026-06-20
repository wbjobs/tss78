import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import db from '../database.js'

const router = Router()

function resolveTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\[${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'), value)
  }
  return result
}

router.post('/api/execute', async (req: Request, res: Response) => {
  const { template, templateContent, variables, images, model, temperature, maxTokens } = req.body
  const promptContent = templateContent || template
  if (!promptContent || !model) {
    res.status(400).json({ success: false, error: 'template and model are required' })
    return
  }

  const vars = variables || {}
  const imagesArr = images || []
  const temp = temperature ?? 0.7
  const maxTok = maxTokens ?? 2048

  const resolvedPrompt = resolveTemplate(promptContent, vars)

  const startTime = Date.now()
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000))
  const duration = Date.now() - startTime

  const result = `基于您提供的提示词和参考图片，模型生成了以下分析结果：\n\n${resolvedPrompt}\n\n---\n*此为模拟响应，请在 .env 文件中配置 LLM_API_KEY 以使用真实大模型API*`

  const tokensUsed = Math.floor(resolvedPrompt.length * 1.5 + Math.random() * 200)

  const id = uuidv4()
  const templateRow = db.prepare('SELECT id FROM prompt_templates WHERE content = ?').get(promptContent) as any
  const templateId = templateRow?.id ?? null

  db.prepare(
    'INSERT INTO execution_records (id, template_id, template_content, variables_json, images_json, model, temperature, max_tokens, result, tokens_used, duration) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    id,
    templateId,
    promptContent,
    JSON.stringify(vars),
    JSON.stringify(imagesArr),
    model,
    temp,
    maxTok,
    result,
    tokensUsed,
    duration
  )

  res.json({
    success: true,
    data: {
      id,
      result,
      tokensUsed,
      duration,
      timestamp: new Date().toISOString(),
    },
  })
})

export default router
