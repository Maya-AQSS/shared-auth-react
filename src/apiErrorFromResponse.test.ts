import { describe, expect, it } from 'vitest'
import { ApiHttpError, apiErrorFromResponse } from './apiClient'

describe('apiErrorFromResponse', () => {
  it('extracts message from the JSON body', async () => {
    const res = new Response(JSON.stringify({ message: 'Token inválido' }), {
      status: 403,
      statusText: 'Forbidden',
    })

    const err = await apiErrorFromResponse(res)

    expect(err).toBeInstanceOf(ApiHttpError)
    expect(err.message).toBe('Token inválido')
    expect(err.status).toBe(403)
  })

  it('falls back to statusText when the body has no message', async () => {
    const res = new Response(JSON.stringify({ foo: 'bar' }), {
      status: 404,
      statusText: 'Not Found',
    })

    const err = await apiErrorFromResponse(res)

    expect(err.message).toBe('Not Found')
    expect(err.status).toBe(404)
  })

  it('falls back to statusText when the body is not JSON', async () => {
    const res = new Response('<html>oops</html>', {
      status: 500,
      statusText: 'Internal Server Error',
    })

    const err = await apiErrorFromResponse(res)

    expect(err.message).toBe('Internal Server Error')
    expect(err.status).toBe(500)
  })
})
