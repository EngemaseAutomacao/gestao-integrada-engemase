// TEMPORÁRIO: lista recursivamente o bucket "imagens" com a service role e
// devolve URLs assinadas para a página /admin/exportar-fotos.
// Acesso restrito a administradores (verificado no código).
import { corsHeaders, getAdminClient, jsonResponse, verifyAdmin } from '../_shared/auth.ts'

const BUCKET = 'imagens'
const PAGE_SIZE = 1000
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 2 // 2 horas
const SIGN_BATCH = 100

interface ExportFile {
  path: string
  size: number | null
  signedUrl: string | null
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido' }, 405)
  }

  try {
    const admin = getAdminClient()
    const adminId = await verifyAdmin(req, admin)
    if (!adminId) {
      return jsonResponse({ error: 'Acesso negado' }, 403)
    }

    // Listagem recursiva (pastas têm id === null)
    const files: { path: string; size: number | null }[] = []
    const queue: string[] = ['']
    while (queue.length > 0) {
      const prefix = queue.shift() as string
      let offset = 0
      while (true) {
        const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })
        if (error) throw new Error(`Falha ao listar "${prefix}": ${error.message}`)
        const entries = data ?? []
        for (const entry of entries) {
          const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
          if (entry.id === null) {
            queue.push(fullPath)
          } else if (entry.name !== '.emptyFolderPlaceholder') {
            const size = typeof entry.metadata?.size === 'number' ? entry.metadata.size : null
            files.push({ path: fullPath, size })
          }
        }
        if (entries.length < PAGE_SIZE) break
        offset += PAGE_SIZE
      }
    }

    // URLs assinadas em lotes
    const result: ExportFile[] = []
    for (let i = 0; i < files.length; i += SIGN_BATCH) {
      const batch = files.slice(i, i + SIGN_BATCH)
      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrls(batch.map((f) => f.path), SIGNED_URL_TTL_SECONDS)
      if (error) throw new Error(`Falha ao assinar URLs: ${error.message}`)
      batch.forEach((f, idx) => {
        result.push({ path: f.path, size: f.size, signedUrl: data?.[idx]?.signedUrl ?? null })
      })
    }

    return jsonResponse({ files: result })
  } catch (err) {
    console.error('export-images-list error:', err)
    return jsonResponse({ error: err instanceof Error ? err.message : 'Erro inesperado' }, 500)
  }
})
