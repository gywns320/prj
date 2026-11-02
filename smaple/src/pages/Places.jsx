import { useEffect, useState } from 'react'
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import ItemCard from '../components/ItemCard'
import { Empty, ErrorAlert, Loading } from '../components/Status'
import { fetchPlaces } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const TYPES = { 12: '관광지', 14: '문화시설', 15: '축제·행사' }

export default function Places() {
  const addFavorite = useAppStore((s) => s.addFavorite)   // STEP 5에서 사용
  const [keyword, setKeyword] = useState('해녀')
  const [type, setType] = useState('12')
  const [places, setPlaces] = useState([])               // ① 데이터
  const [loading, setLoading] = useState(true)           // ② 로딩
  const [error, setError] = useState('')                 // ③ 에러

  async function search(e) {
    e?.preventDefault()                                  // 폼 제출 시 새로고침 막기
    setLoading(true); setError('')
    try { setPlaces(await fetchPlaces(keyword, type)) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { search() }, [])                      // 처음 한 번 자동 검색

  return (
    <>
      <PageHeader icon="geo-alt" title="관광·문화" subtitle="한국관광공사 TourAPI" />
      <Form onSubmit={search} className="mb-4">
        <InputGroup>
          <Form.Select value={type} onChange={(e) => setType(e.target.value)} style={{ maxWidth: 140 }}>
            {Object.entries(TYPES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Form.Select>
          <Form.Control value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="검색어" />
          <Button type="submit"><i className="bi bi-search" /></Button>
        </InputGroup>
      </Form>

      <ErrorAlert error={error} />
      {loading ? <Loading /> : places.length === 0 ? <Empty /> : (
        <Row xs={1} sm={2} lg={3} className="g-3">
          {places.map((p) => (
            <Col key={p.id}>
              <ItemCard title={p.title} subtitle={p.addr} image={p.image} badge={TYPES[p.type]}
                onSave={() => addFavorite({ source: 'tour', id: p.id, title: p.title })} />
            </Col>
          ))}
        </Row>
      )}
    </>
  )
}
