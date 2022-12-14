import axios, { AxiosError } from "axios"
import { load } from "cheerio"

async function handler(url: string) {
  const resp = await axios.get(url)
  const $ = load(resp.data)
  const urlObj = new URL(url)
  const type = urlObj.pathname.split('/')[3]

  switch (type) {
    case 'posts':
      return await Promise.all($('div.ltk-product.pa-1 a').toArray().map((elem) => $(elem).attr('href'))
        .map(async (elem) => await getFinalUrl(elem || '')))
    case 'giftguides':
      return await Promise.all($('div.pa-1 a').toArray().map((elem) => $(elem).attr('href'))
        .map(async (elem) => await getFinalUrl(elem || '')))
    default:
      return []
  }
}

async function getFinalUrl(url: string) {
  try {
    const response = await axios.get(url)
    const refreshUrl = response.headers['refresh']?.replace('0; url=', '')
    if (refreshUrl) {
      return await redirect(refreshUrl, [])
    }
  } catch (error) {
    return (error as unknown as AxiosError).message
  }
}

async function redirect(url: string, redirects: string[]): Promise<string | undefined> {
  try {
    const resp = await axios.request({
      url,
      maxRedirects: 0,
      validateStatus: (status) => status === 200 || (status >= 300 && status < 400),
      headers: {
        'Accept-Encoding': 'gzip, deflate, compress'
      }
    })
    if (resp.status === 200) {
      if (redirects.length > 1 && url.includes('VerifyHuman')) {
        return redirects[redirects.length - 2] //
      } else {
        return url
      }
    } else {
      if (resp.headers['location'] && url !== resp.headers['location']) { // 무한루프 방지
        redirects.push(resp.headers['location'])
        return await redirect(resp.headers['location'], redirects)
      } else if (url === resp.headers['location']) {
        return url
      }
    }
  } catch (error) {
    return (error as unknown as AxiosError).message
  }
}

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms))
}

export {
  handler
}

(async () => {
  const result = await handler('https://www.shopltk.com/explore/beautyprofessor/posts/268824ea-7a92-11ed-9120-0242ac110003')
  console.log(result)
})()