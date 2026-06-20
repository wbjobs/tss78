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

async function runSingleExecution(
  promptContent: string,
  variables: Record<string, string>,
  images: string[],
  model: string,
  temperature: number,
  maxTokens: number
): Promise<{
  id: string
  templateId: string | null
  templateContent: string
  variables: Record<string, string>
  images: string[]
  model: string
  temperature: number
  maxTokens: number
  result: string
  tokensUsed: number
  duration: number
  createdAt: string
}> {
  const resolvedPrompt = resolveTemplate(promptContent, variables)
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
    JSON.stringify(variables),
    JSON.stringify(images),
    model,
    temperature,
    maxTokens,
    result,
    tokensUsed,
    duration
  )

  return {
    id,
    templateId,
    templateContent: promptContent,
    variables,
    images,
    model,
    temperature,
    maxTokens,
    result,
    tokensUsed,
    duration,
    createdAt: new Date().toISOString(),
  }
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

  const record = await runSingleExecution(promptContent, vars, imagesArr, model, temp, maxTok)

  res.json({
    success: true,
    data: {
      id: record.id,
      result: record.result,
      tokensUsed: record.tokensUsed,
      duration: record.duration,
      timestamp: record.createdAt,
    },
  })
})

router.post('/api/execute/batch', async (req: Request, res: Response) => {
  const { template, templateContent, combinations, model, temperature, maxTokens } = req.body
  const promptContent = templateContent || template

  if (!promptContent || !model) {
    res.status(400).json({ success: false, error: 'template and model are required' })
    return
  }

  if (!combinations || !Array.isArray(combinations) || combinations.length === 0) {
    res.status(400).json({ success: false, error: 'combinations is required and must be a non-empty array' })
    return
  }

  if (combinations.length > 100) {
    res.status(400).json({ success: false, error: '组合数量不能超过 100 组' })
    return
  }

  const temp = temperature ?? 0.7
  const maxTok = maxTokens ?? 2048

  const startedAt = Date.now()
  const results: any[] = []

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i]
    const { variables = {}, images = [] } = combo
    try {
      const record = await runSingleExecution(promptContent, variables, images, model, temp, maxTok)
      results.push({
        index: i,
        combinationId: combo.id ?? `${i}`,
        success: true,
        ...record,
      })
    } catch (err: any) {
      results.push({
        index: i,
        combinationId: combo.id ?? `${i}`,
        success: false,
        error: err.message || 'Execution failed',
      })
    }
  }

  const totalDuration = Date.now() - startedAt

  res.json({
    success: true,
    data: {
      results,
      total: combinations.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalDuration,
      startedAt: new Date(startedAt).toISOString(),
    },
  })
})

export default router
