import { useEffect, useMemo, useState } from 'react'
import { Package, RefreshCw, LayoutDashboard, ClipboardList, Search, ArrowUpRight, Clock3, CheckCircle2, AlertCircle, Shirt, Truck, Boxes, BarChart3 } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)
const pretty = s => (s || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
const terminal = ['COMPLETED', 'REJECTED']

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Something went wrong')
  return data
}

function App() {
  const [tab, setTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [returns, setReturns] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ order_id: '', request_type: 'RETURN', reason: 'SIZE_TOO_SMALL', comments: '', requested_size: '' })
  const [inspection, setInspection] = useState({ disposition: 'RESTOCK', note: '', requested_size: '' })

  async function refresh() {
    setLoading(true)
    try {
      const [o, r, a, i] = await Promise.all([
        request('/api/orders'), request('/api/returns'), request('/api/analytics'), request('/api/inventory')
      ])
      setOrders(o); setReturns(r); setAnalytics(a); setInventory(i)
      setSelected(old => old ? (r.find(x => x.id === old.id) || null) : null)
    } catch (e) { setToast(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 3200)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => returns.filter(r =>
    (filter === 'ALL' || r.status === filter) &&
    `${r.id} ${r.customer_name} ${r.product_name} ${r.sku}`.toLowerCase().includes(search.toLowerCase())
  ), [returns, filter, search])

  async function createRequest(e) {
    e.preventDefault()
    try {
      await request('/api/returns', { method: 'POST', body: JSON.stringify({ ...form, order_id: Number(form.order_id), requested_size: form.request_type === 'EXCHANGE' ? form.requested_size : null }) })
      setToast('Request created successfully')
      setForm({ order_id: '', request_type: 'RETURN', reason: 'SIZE_TOO_SMALL', comments: '', requested_size: '' })
      await refresh()
      setTab('customer')
    } catch (e) { setToast(e.message) }
  }

  async function advance(r, status) {
    try {
      await request(`/api/returns/${r.id}/status`, { method: 'PATCH', body: JSON.stringify({ status, note: 'Updated from operations workspace' }) })
      setToast(`Request #${r.id} moved to ${pretty(status)}`)
      await refresh()
    } catch (e) { setToast(e.message) }
  }

  async function inspect(r) {
    try {
      await request(`/api/returns/${r.id}/inspect`, { method: 'POST', body: JSON.stringify({ ...inspection, requested_size: inspection.requested_size || r.requested_size }) })
      setToast(`Inspection completed for request #${r.id}`)
      setSelected(null)
      await refresh()
    } catch (e) { setToast(e.message) }
  }

  const nav = [
    ['overview', LayoutDashboard, 'Overview'],
    ['customer', Package, 'Customer portal'],
    ['operations', ClipboardList, 'Operations'],
    ['analytics', BarChart3, 'Analytics'],
    ['inventory', Boxes, 'Inventory']
  ]

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><RefreshCw size={19}/></div><div><strong>Re:turn</strong><span>INTELLIGENCE</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav>{nav.map(([id, Icon, label]) => <button key={id} className={`nav-item ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={18}/><span>{label}</span>{id === 'operations' && analytics?.open_requests > 0 && <b className="nav-count">{analytics.open_requests}</b>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="avatar">PM</div><div><strong>Demo Workspace</strong><small>Operations team</small></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="eyebrow">POST-PURCHASE OPERATIONS</div><h1>{nav.find(n => n[0] === tab)?.[2]}</h1></div><div className="top-actions"><span className="live-dot">DEMO DATA</span><button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCw size={17}/></button></div></header>
      {loading && <div className="loading-line">Syncing workspace…</div>}
      {tab === 'overview' && <Overview analytics={analytics} returns={returns} setTab={setTab} />}
      {tab === 'customer' && <Customer orders={orders} returns={returns} form={form} setForm={setForm} createRequest={createRequest} />}
      {tab === 'operations' && <Operations returns={filtered} filter={filter} setFilter={setFilter} search={search} setSearch={setSearch} selected={selected} setSelected={setSelected} advance={advance} inspection={inspection} setInspection={setInspection} inspect={inspect} />}
      {tab === 'analytics' && <Analytics analytics={analytics} />}
      {tab === 'inventory' && <Inventory inventory={inventory} />}
      <footer>Re:turn Intelligence <span>•</span> Simulated portfolio environment <span>•</span> v1.0</footer>
    </main>
    {toast && <div className="toast"><CheckCircle2 size={17}/>{toast}</div>}
  </div>
}

function Metric({ label, value, note, icon: Icon, tone = '' }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={18}/></div><div className="metric-label">{label}</div><div className="metric-value">{value ?? '—'}</div><div className="metric-note">{note}</div></div>
}
function Status({ value }) { return <span className={`status status-${(value || '').toLowerCase()}`}>{pretty(value)}</span> }

function Overview({ analytics, returns, setTab }) {
  const recent = returns.slice(0, 4)
  return <div className="content">
    <section className="welcome"><div><div className="eyebrow light">OPERATIONS SNAPSHOT</div><h2>Make every return<br/>a better experience.</h2><p>Track post-purchase requests, resolve issues faster, and bring inventory back into circulation.</p><button className="primary-btn" onClick={() => setTab('operations')}>Open operations <ArrowUpRight size={16}/></button></div><div className="welcome-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-box"><Package size={58}/></div><div className="art-tag tag-a">Return received</div><div className="art-tag tag-b">Inventory updated</div></div></section>
    <div className="section-heading"><div><h3>Key performance indicators</h3><p>Live summary from the demo workspace</p></div><span className="muted-label">UPDATED JUST NOW</span></div>
    <div className="metric-grid">
      <Metric label="Return rate" value={`${analytics?.return_rate_pct ?? 0}%`} note={`${analytics?.total_requests ?? 0} requests / ${analytics?.delivered_orders ?? 0} delivered orders`} icon={RefreshCw} tone="purple"/>
      <Metric label="Open requests" value={analytics?.open_requests ?? 0} note="Require an operations action" icon={ClipboardList} tone="orange"/>
      <Metric label="Avg. resolution" value={`${analytics?.avg_resolution_hours ?? 0}h`} note="For requests already resolved" icon={Clock3} tone="blue"/>
      <Metric label="Restock rate" value={`${analytics?.restock_rate_pct ?? 0}%`} note="Of requests with an inspection outcome" icon={Boxes} tone="green"/>
    </div>
    <div className="section-heading"><div><h3>Recent requests</h3><p>Latest customer return and exchange activity</p></div><button className="text-btn" onClick={() => setTab('operations')}>View all <ArrowUpRight size={15}/></button></div>
    <div className="table-card"><RequestTable rows={recent}/></div>
  </div>
}

function Customer({ orders, returns, form, setForm, createRequest }) {
  const activeOrders = orders.filter(o => o.delivered)
  return <div className="content two-col">
    <section className="panel"><div className="panel-head"><div><h3>Start a return or exchange</h3><p>Select a delivered order and tell us what went wrong.</p></div><div className="panel-icon"><Package size={19}/></div></div>
      <form className="request-form" onSubmit={createRequest}>
        <label>Choose order<select required value={form.order_id} onChange={e => setForm({...form, order_id:e.target.value})}><option value="">Select an order</option>{activeOrders.map(o => <option value={o.id} key={o.id}>#{o.id} · {o.product_name} · {o.size} · {money(o.price)}</option>)}</select></label>
        <label>Request type<div className="segmented"><button type="button" className={form.request_type === 'RETURN' ? 'chosen' : ''} onClick={() => setForm({...form, request_type:'RETURN'})}>Return</button><button type="button" className={form.request_type === 'EXCHANGE' ? 'chosen' : ''} onClick={() => setForm({...form, request_type:'EXCHANGE'})}>Exchange</button></div></label>
        <label>Reason<select value={form.reason} onChange={e => setForm({...form, reason:e.target.value})}><option value="SIZE_TOO_SMALL">Size too small</option><option value="SIZE_TOO_LARGE">Size too large</option><option value="DAMAGED_ITEM">Item damaged</option><option value="QUALITY_ISSUE">Quality issue</option><option value="COLOUR_DIFFERENCE">Colour differs from images</option><option value="COMFORT_ISSUE">Comfort / fit issue</option><option value="WRONG_ITEM">Wrong item received</option><option value="OTHER">Other</option></select></label>
        {form.request_type === 'EXCHANGE' && <label>Requested size<select required value={form.requested_size} onChange={e => setForm({...form, requested_size:e.target.value})}><option value="">Choose size</option>{['XS','S','M','L','XL','28','30','32','34','36','7','8','9','10'].map(s => <option key={s}>{s}</option>)}</select></label>}
        <label>Additional details <span className="optional">OPTIONAL</span><textarea rows="3" placeholder="Add context that may help our team…" value={form.comments} onChange={e => setForm({...form, comments:e.target.value})}/></label>
        <button className="primary-btn full" type="submit">Submit request <ArrowUpRight size={16}/></button>
        <p className="form-note"><AlertCircle size={14}/> Demo workflow: no real pickup or refund is initiated.</p>
      </form>
    </section>
    <section className="panel"><div className="panel-head"><div><h3>Your request timeline</h3><p>Track submitted return and exchange requests.</p></div><div className="panel-icon"><Clock3 size={19}/></div></div>
      <div className="timeline-list">{returns.map(r => <div className="timeline-item" key={r.id}><div className="timeline-dot"></div><div className="timeline-main"><div className="timeline-title">Request #{r.id} · {r.product_name}</div><div className="timeline-sub">{pretty(r.request_type)} · {pretty(r.reason)}</div><Status value={r.status}/></div><span className="timeline-date">{new Date(r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}</span></div>)}{!returns.length && <div className="empty">No requests yet. Submit one to see its progress.</div>}</div>
    </section>
  </div>
}

function RequestTable({ rows, onSelect }) {
  if (!rows?.length) return <div className="empty">No requests match this view.</div>
  return <div className="table-wrap"><table><thead><tr><th>REQUEST</th><th>CUSTOMER</th><th>PRODUCT</th><th>TYPE</th><th>REASON</th><th>STATUS</th></tr></thead><tbody>{rows.map(r => <tr key={r.id} onClick={() => onSelect?.(r)} className={onSelect ? 'click-row' : ''}><td><strong>#{r.id}</strong><small>{new Date(r.created_at).toLocaleDateString('en-IN')}</small></td><td>{r.customer_name}</td><td>{r.product_name}<small>SKU: {r.sku}</small></td><td>{pretty(r.request_type)}</td><td>{pretty(r.reason)}</td><td><Status value={r.status}/></td></tr>)}</tbody></table></div>
}

function Operations({ returns, filter, setFilter, search, setSearch, selected, setSelected, advance, inspection, setInspection, inspect }) {
  const filters = ['ALL','REQUESTED','APPROVED','PICKUP_SCHEDULED','RECEIVED','COMPLETED','REJECTED']
  const next = { REQUESTED:'APPROVED', APPROVED:'PICKUP_SCHEDULED', PICKUP_SCHEDULED:'RECEIVED' }
  return <div className="content">
    <div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search request, customer or product…" value={search} onChange={e => setSearch(e.target.value)}/></div><div className="filter-row">{filters.map(f => <button key={f} className={filter===f?'filter-active':''} onClick={() => setFilter(f)}>{pretty(f)}</button>)}</div></div>
    <div className="ops-layout"><section className="table-card"><div className="table-title"><div><h3>Request queue</h3><p>{returns.length} requests in current view</p></div><span className="muted-label">CLICK A ROW TO REVIEW</span></div><RequestTable rows={returns} onSelect={setSelected}/></section>
    <aside className="panel detail-panel">{selected ? <><div className="panel-head"><div><span className="eyebrow">REQUEST #{selected.id}</span><h3>{selected.product_name}</h3><p>{selected.customer_name} · {selected.sku}</p></div><button className="close-btn" onClick={() => setSelected(null)}>×</button></div><div className="detail-summary"><div><small>REQUEST TYPE</small><strong>{pretty(selected.request_type)}</strong></div><div><small>REASON</small><strong>{pretty(selected.reason)}</strong></div><div><small>ORDER VALUE</small><strong>{money(selected.price)}</strong></div><div><small>ORDER SIZE</small><strong>{selected.size}</strong></div></div><div className="detail-status"><span>Current status</span><Status value={selected.status}/></div>
      {selected.comments && <div className="customer-note"><small>CUSTOMER NOTE</small><p>{selected.comments}</p></div>}
      {next[selected.status] && <button className="primary-btn full" onClick={() => advance(selected,next[selected.status])}>Mark as {pretty(next[selected.status])} <ArrowUpRight size={15}/></button>}
      {selected.status === 'RECEIVED' && <div className="inspection-box"><h4>Inspection outcome</h4><label>Disposition<select value={inspection.disposition} onChange={e => setInspection({...inspection,disposition:e.target.value})}><option value="RESTOCK">Restock item</option><option value="REFUND">Approve refund</option><option value="EXCHANGE">Complete exchange</option><option value="REJECT">Reject request</option></select></label>{inspection.disposition === 'EXCHANGE' && <label>Exchange size<input value={inspection.requested_size || selected.requested_size || ''} onChange={e => setInspection({...inspection,requested_size:e.target.value})} placeholder="e.g. L"/></label>}<label>Inspection note<textarea rows="2" value={inspection.note} onChange={e => setInspection({...inspection,note:e.target.value})} placeholder="Condition, packaging, tags…"/></label><button className="primary-btn full" onClick={() => inspect(selected)}>Save inspection outcome</button></div>}
      {terminal.includes(selected.status) && <div className="success-note"><CheckCircle2 size={17}/> This request is closed. Outcome: {pretty(selected.disposition || selected.status)}</div>}
      <div className="workflow-note"><strong>Workflow rule</strong><p>Requests move through approved operational stages. Inspection is available only after the item is marked received.</p></div>
    </> : <div className="select-empty"><ClipboardList size={30}/><h3>Review a request</h3><p>Select a row from the queue to view details and available actions.</p></div>}</aside></div>
  </div>
}

function Analytics({ analytics }) {
  const reasons = analytics?.reason_mix || []
  const max = Math.max(1, ...reasons.map(x=>x.count))
  return <div className="content"><div className="metric-grid">
    <Metric label="Delivered orders" value={analytics?.delivered_orders ?? 0} note="Seeded demo order base" icon={Package}/>
    <Metric label="Total requests" value={analytics?.total_requests ?? 0} note="Return and exchange requests" icon={RefreshCw}/>
    <Metric label="Avg. resolution" value={`${analytics?.avg_resolution_hours ?? 0}h`} note="Resolved requests only" icon={Clock3}/>
    <Metric label="Restock rate" value={`${analytics?.restock_rate_pct ?? 0}%`} note="Restock dispositions / inspected" icon={Boxes}/>
  </div><div className="analytics-grid"><section className="panel"><div className="panel-head"><div><h3>Return reason mix</h3><p>Why customers initiate a post-purchase request</p></div></div>{reasons.length ? reasons.map(x=><div className="bar-row" key={x.reason}><div><span>{pretty(x.reason)}</span><strong>{x.count}</strong></div><div className="bar-track"><div className="bar-fill" style={{width:`${x.count/max*100}%`}}/></div></div>) : <div className="empty">No reason data yet.</div>}</section>
    <section className="panel"><div className="panel-head"><div><h3>Request status mix</h3><p>Current distribution across the workflow</p></div></div>{(analytics?.status_mix || []).map(x=><div className="status-row" key={x.status}><Status value={x.status}/><strong>{x.count}</strong></div>)}</section></div><div className="insight-callout"><AlertCircle size={18}/><div><strong>Interpretation note</strong><p>With a small seeded dataset, these metrics demonstrate instrumentation and workflow reporting—not statistically reliable business conclusions. Add representative data before making product or commercial decisions.</p></div></div></div>
}

function Inventory({ inventory }) {
  const [q,setQ] = useState('')
  const rows = inventory.filter(i => `${i.sku} ${i.size}`.toLowerCase().includes(q.toLowerCase()))
  return <div className="content"><div className="inventory-intro"><div><h3>Exchange and recovery stock</h3><p>Available quantity by SKU and size. Exchange completion validates stock before reducing it.</p></div><div className="panel-icon"><Boxes size={20}/></div></div><div className="toolbar"><div className="searchbox"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search SKU or size…"/></div></div><div className="table-card"><div className="table-wrap"><table><thead><tr><th>SKU</th><th>SIZE</th><th>AVAILABLE QTY</th><th>STOCK HEALTH</th></tr></thead><tbody>{rows.map(i=><tr key={i.id}><td><strong>{i.sku}</strong></td><td>{i.size}</td><td><strong>{i.available_qty}</strong></td><td><span className={`stock ${i.available_qty===0?'out':i.available_qty<3?'low':'healthy'}`}>{i.available_qty===0?'Out of stock':i.available_qty<3?'Low stock':'Healthy'}</span></td></tr>)}</tbody></table></div></div></div>
}

export default App
