import { useEffect } from 'react'
import { store } from '../config/store'
import { getApp } from '../shared/apps'
import { Layout } from './Layout'
import { Admin } from './pages/Admin'
import { AppDetail, Catalog, Home } from './pages/Browse'
import { Checkout, Confirmation } from './pages/Checkout'
import { Faq, InstallGuide, NotFound, Policy, Privacy, Track } from './pages/Info'
import { match, useRoute } from './router'

export default function App() {
  const { path, params } = useRoute()
  const appParam = match('/apps/:slug', path) ?? match('/checkout/:slug', path)
  const app = appParam ? getApp(appParam.slug) : undefined

  let page = <NotFound />
  let title = 'Page not found'
  if (path === '/') [page, title] = [<Home />, 'Pickleball apps']
  else if (path === '/apps') [page, title] = [<Catalog />, 'All apps']
  else if (app && path.startsWith('/apps/')) [page, title] = [<AppDetail app={app} />, app.name]
  else if (app && path.startsWith('/checkout/')) [page, title] = [<Checkout key={app.slug} app={app} />, `Checkout · ${app.name}`]
  else if (match('/confirmation/:id', path)) [page, title] = [<Confirmation orderId={match('/confirmation/:id', path)!.id} />, 'Order received']
  else if (path === '/install') [page, title] = [<InstallGuide />, 'Install guide']
  else if (path === '/faq') [page, title] = [<Faq />, 'FAQ']
  else if (path === '/track') [page, title] = [<Track key={params.get('id') ?? ''} initialId={params.get('id') ?? ''} />, 'Track order']
  else if (path === '/privacy') [page, title] = [<Privacy />, 'Privacy policy']
  else if (path === '/policy') [page, title] = [<Policy />, 'Purchase & refund policy']
  else if (path === '/admin') [page, title] = [<Admin />, 'Order desk']

  useEffect(() => {
    document.title = `${title} · ${store.businessName}`
  }, [title])

  return <Layout path={path}>{page}</Layout>
}
