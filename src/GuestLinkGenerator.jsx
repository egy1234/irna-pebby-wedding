import { useEffect, useState } from 'react'
import './GuestLinkGenerator.css'

function GuestLinkGenerator() {
  const [names, setNames] = useState('')
  const [guests, setGuests] = useState([])
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)

  useEffect(() => {
    document.title = 'Buat Tautan Tamu — Irna & Peby'
  }, [])

  const generateLinks = (event) => {
    event.preventDefault()
    const guestNames = names
      .split(/\r?\n/)
      .map((name) => name.trim())
      .filter(Boolean)

    if (guestNames.length === 0) {
      setGuests([])
      setNotice('Masukkan setidaknya satu nama tamu.')
      setNoticeIsError(true)
      return
    }

    const invitationUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
    const generatedGuests = guestNames.map((name) => {
      const link = new URL(invitationUrl)
      link.searchParams.set('to', name)
      return { name, url: link.toString() }
    })

    setGuests(generatedGuests)
    setNotice(`${generatedGuests.length} tautan personal berhasil dibuat.`)
    setNoticeIsError(false)
  }

  const copyText = async (text, successMessage) => {
    try {
      await navigator.clipboard.writeText(text)
      setNotice(successMessage)
      setNoticeIsError(false)
    } catch {
      setNotice('Tidak dapat menyalin otomatis. Pilih dan salin tautan secara manual.')
      setNoticeIsError(true)
    }
  }

  const copyAllLinks = () => {
    const text = guests.map(({ name, url }) => `${name}\t${url}`).join('\n')
    void copyText(text, `${guests.length} tautan disalin. Tempel ke spreadsheet atau dokumen.`)
  }

  const downloadCsv = () => {
    const escapeCsv = (value) => `"${value.replaceAll('"', '""')}"`
    const csv = [
      `${escapeCsv('Nama tamu')},${escapeCsv('Tautan undangan')}`,
      ...guests.map(({ name, url }) => `${escapeCsv(name)},${escapeCsv(url)}`),
    ].join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = 'tautan-undangan-tamu.csv'
    link.click()
    URL.revokeObjectURL(downloadUrl)
    setNotice('File CSV tautan tamu berhasil diunduh.')
    setNoticeIsError(false)
  }

  return (
    <main className="link-generator-page">
      <header className="link-generator-header">
        <a className="link-generator-brand" href={import.meta.env.BASE_URL} aria-label="Kembali ke undangan Irna dan Peby">
          I<span>&</span>P
        </a>
        <a className="link-generator-back" href={import.meta.env.BASE_URL}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Kembali ke undangan
        </a>
      </header>

      <section className="link-generator-content">
        <p className="link-generator-eyebrow">IRNA &amp; PEBY · PERANGKAT PENGELOLA</p>
        <h1>Buat tautan<br /><em>undangan personal.</em></h1>
        <p className="link-generator-intro">
          Masukkan nama tamu, satu nama per baris. Setiap tautan akan menampilkan nama penerima pada halaman pembuka undangan.
        </p>

        <form className="link-generator-form" onSubmit={generateLinks}>
          <label htmlFor="guest-names">Daftar nama tamu</label>
          <textarea
            id="guest-names"
            value={names}
            onChange={(event) => setNames(event.target.value)}
            placeholder="Masukkan nama tamu, satu nama per baris"
            rows={8}
          />
          <div className="link-generator-form-footer">
            <span>Satu nama per baris · Bisa untuk banyak tamu sekaligus</span>
            <button type="submit">
              Buat tautan <i className="bi bi-arrow-right" aria-hidden="true" />
            </button>
          </div>
        </form>

        {notice && (
          <p className={`link-generator-notice ${noticeIsError ? 'is-error' : ''}`} role="status">
            {notice}
          </p>
        )}

        {guests.length > 0 && (
          <section className="link-generator-results" aria-labelledby="generated-links-title">
            <div className="link-generator-results-heading">
              <div>
                <p className="link-generator-eyebrow">SIAP DIBAGIKAN</p>
                <h2 id="generated-links-title">{guests.length} tautan tamu</h2>
              </div>
              <div className="link-generator-actions">
                <button type="button" onClick={copyAllLinks}>
                  <i className="bi bi-copy" aria-hidden="true" /> Salin semua
                </button>
                <button type="button" onClick={downloadCsv}>
                  <i className="bi bi-download" aria-hidden="true" /> Unduh CSV
                </button>
              </div>
            </div>
            <ol className="link-generator-list">
              {guests.map(({ name, url }, index) => (
                <li key={`${name}-${index}`}>
                  <div className="link-generator-guest">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{name}</strong>
                  </div>
                  <div className="link-generator-url-row">
                    <input aria-label={`Tautan undangan untuk ${name}`} readOnly value={url} onFocus={(event) => event.target.select()} />
                    <button
                      type="button"
                      aria-label={`Salin tautan untuk ${name}`}
                      onClick={() => void copyText(url, `Tautan untuk ${name} disalin.`)}
                    >
                      <i className="bi bi-copy" aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <p className="link-generator-privacy">
              <i className="bi bi-shield-check" aria-hidden="true" />
              Nama hanya diproses di halaman ini dan tidak disimpan oleh website.
            </p>
          </section>
        )}
      </section>
    </main>
  )
}

export default GuestLinkGenerator
