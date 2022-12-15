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
    if (url.startsWith('/')) return redirects[redirects.length - 2]
    const resp = await axios.request({
      url,
      maxRedirects: 0,
      validateStatus: (status) => status === 200 || (status >= 300 && status < 400) || status === 403,
      headers: {
        'Accept-Encoding': 'gzip, deflate, compress'
      }
    })
    if (resp.status === 200 || resp.status === 403) {
      const parsedUrl = new URL(url)
      if (url.includes('kr.revolve.com/VerifyHuman.jsp')) {
        return parsedUrl.hostname.concat(parsedUrl.searchParams.get('url') || '')
      } else if (parsedUrl.hostname.includes('shareasale') && parsedUrl.searchParams.get('urllink') !== null) {
        return parsedUrl.searchParams.get('urllink') || undefined
      } else if (parsedUrl.hostname === 'click.linksynergy.com' && parsedUrl.searchParams.get('murl') !== null) {
        return parsedUrl.searchParams.get('murl') || undefined
      } else if (parsedUrl.hostname === 'www.neimanmarcus.com' && parsedUrl.searchParams.get('url') !== null) {
        return parsedUrl.searchParams.get('url') || undefined
      } else if (parsedUrl.hostname === 'oldnavy.gap.com' && parsedUrl.pathname === '/CookieFailure.do') {
        parsedUrl.pathname = '/browse/product.do'
        return parsedUrl.href
      }
      return url
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
  const result = await handler('https://www.shopltk.com/explore/mytexashouse/posts/47ea1129-7bf5-11ed-a127-0242ac110004')
  console.log(result)
})()