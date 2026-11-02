import { useEffect, useState } from 'react'
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchHeritage } from '../api/client'
import { useAppStore } from '../store/useAppStore'

export default function Heritage() {
  const addFavorite = useAppStore((s) => s.addFavorite)
  const [keyword, setKeyword] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function search(e) {
    e?.preventDefault()
    setLoading(true); setError('')
    try { setList(await fetchHeritage(keyword)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])

  return (
    <>
      <PageHeader icon="bank" title="국가유산" subtitle="국가유산청 국가유산 검색" />
      <Form onSubmit={search} className="mb-4">
        <InputGroup>
          <Form.Control value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="예: 관덕정, 돌하르방" />
          <Button type="submit"><i className="bi bi-search" /></Button>
        </InputGroup>
      </Form>
      <ErrorAlert error={error} />
      {loading ? <Loading /> : list.length === 0 ? <Empty /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {list.map((h, i) => (
            <Col key={i}>
              <ItemCard title={h.name} subtitle={h.city} badge={h.kind}
                onSave={() => addFavorite({ source: 'heritage', id: h.name, title: h.name })} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
