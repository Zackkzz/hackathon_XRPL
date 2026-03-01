import React, { useState } from 'react'
import './App.css'

interface Escrow {
  id: string
  status: 'pending' | 'finished' | 'cancelled'
  amount: string
  destinationAddress: string
  finishAfter: string
  cancelAfter?: string
  condition?: string
  createdAt: string
}

interface Booking {
  id: string
  eventId: string
  status: string
  holdExpiresAt: number
}

function App() {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [walletAddress] = useState('rN7n7otQDd6FczFgLdSqtcsAUxDkw6fzRH')
  const [formData, setFormData] = useState({
    amount: '1000',
    destinationAddress: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1',
    finishAfter: '',
    cancelAfter: '',
    condition: 'A0258020E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA49599187852B855810100'
  })
  
  // Mock escrow data - in real app, this would come from API
  const [escrows] = useState<Escrow[]>([
    {
      id: 'ESC-001',
      status: 'pending',
      amount: '1000',
      destinationAddress: 'rU6K7V3Po4snVhBBaU29sesqs2qTQJWDw1',
      finishAfter: '2026-03-01T23:00:00',
      createdAt: '2026-02-28T21:30:00'
    }
  ])

  // Booking / anti-ghosting state
  const [eventId, setEventId] = useState('TABLE_5')
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [bookingError, setBookingError] = useState<string | null>(null)

  const [txHash, setTxHash] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  // Category dropdown state
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  // Countdown effect
  React.useEffect(() => {
    if (!currentBooking) {
      setTimeLeft(null)
      return
    }

    const updateTimeLeft = () => {
      const remaining = currentBooking.holdExpiresAt - Date.now()
      setTimeLeft(remaining > 0 ? remaining : 0)
    }

    updateTimeLeft()
    const interval = window.setInterval(updateTimeLeft, 1000)

    return () => window.clearInterval(interval)
  }, [currentBooking])

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You can add a toast notification here
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    console.log('Form submitted:', formData)
  }

  // --- Booking API calls ---
  const handleBook = async () => {
    setBookingLoading(true)
    setBookingError(null)
    setConfirmMessage(null)
    setConfirmError(null)

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ eventId }),
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const data: Booking = await response.json()
      setCurrentBooking(data)
      setTxHash('')
    } catch (error) {
      console.error(error)
      setBookingError('Could not create booking. Please try again.')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!currentBooking) return

    setConfirmLoading(true)
    setConfirmMessage(null)
    setConfirmError(null)

    try {
      const response = await fetch('/api/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: currentBooking.id, txHash }),
      })

      const data = await response.json()

      if (!response.ok) {
        setConfirmError(data.message ?? 'Payment failed or too late.')
      } else {
        setConfirmMessage(data.message ?? 'Success! Table is yours.')
      }
    } catch (error) {
      console.error(error)
      setConfirmError('Could not reach server. Please try again.')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleFinishEscrow = (escrowId: string) => {
    // Handle finish escrow action
    console.log('Finish escrow:', escrowId)
  }

  const handleCancelEscrow = (escrowId: string) => {
    // Handle cancel escrow action
    console.log('Cancel escrow:', escrowId)
  }

  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    const ampm = date.getHours() >= 12 ? 'pm' : 'am'
    const displayHours = date.getHours() % 12 || 12
    
    return `${day}/${month}/${year}, ${displayHours}:${minutes}:${seconds} ${ampm}`
  }

  const formatDateTimeLocal = (dateTimeString: string): string => {
    const date = new Date(dateTimeString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const formatCountdown = (ms: number | null): string => {
    if (ms == null) return '--:--'
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedCategory) {
      console.log('Selected category:', selectedCategory)
      // Handle category selection here
    }
  }

  return (
    <div className="app">
      <div className="category-selector">
        <form onSubmit={handleCategorySubmit} className="category-form">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-dropdown"
          >
            <option value="">Select Category</option>
            <option value="hospitality">1. Hospitality</option>
            <option value="restaurants">2. Restaurants</option>
            <option value="aviation">3. Aviation</option>
            <option value="real-estate">4. Real Estate</option>
          </select>
          <button type="submit" className="category-submit-button">
            Submit
          </button>
        </form>
      </div>

      <header className="header">
        <h1 className="title">XRP Ledger Escrow</h1>
        <p className="subtitle">Secure payment booking with smart escrow features</p>
      </header>

      <div className="note-box">
        <strong>Note:</strong> This is a demo interface. To use with real XRP Ledger, install the{' '}
        <a href="https://www.npmjs.com/package/xrpl" target="_blank" rel="noopener noreferrer" className="link">
          xrpl
        </a>{' '}
        library and replace mock functions with actual blockchain transactions.
      </div>

      <div className="wallet-section">
        <div className="wallet-label-container">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="wallet-icon">
            <path d="M15 3H3C1.89543 3 1 3.89543 1 5V13C1 14.1046 1.89543 15 3 15H15C16.1046 15 17 14.1046 17 13V5C17 3.89543 16.1046 3 15 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1 7H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 10C13.5523 10 14 9.55228 14 9C14 8.44772 13.5523 8 13 8C12.4477 8 12 8.44772 12 9C12 9.55228 12.4477 10 13 10Z" fill="currentColor"/>
          </svg>
          <label className="wallet-label">Wallet Address</label>
        </div>
        <div className="wallet-input-container">
          <input
            type="text"
            value={walletAddress}
            readOnly
            className="wallet-input"
          />
          <button
            type="button"
            onClick={() => copyToClipboard(walletAddress)}
            className="copy-button"
            aria-label="Copy wallet address"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.5 3.5H3.5C2.67157 3.5 2 4.17157 2 5V12.5C2 13.3284 2.67157 14 3.5 14H11C11.8284 14 12.5 13.3284 12.5 12.5V10.5M5.5 3.5C5.5 2.67157 6.17157 2 7 2H9.5C10.3284 2 11 2.67157 11 3.5V6C11 6.82843 10.3284 7.5 9.5 7.5H7C6.17157 7.5 5.5 6.82843 5.5 6V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Anti-Ghosting Booking Demo */}
      <section className="booking-section">
        <div className="section-header">
          <h2 className="section-title">Anti-Ghosting Booking Demo</h2>
          <p className="section-description">
            Start a 10-minute hold for a table or event, then confirm payment once the RLUSD transfer is visible.
          </p>
        </div>

        <div className="booking-grid">
          <div className="booking-card">
            <div className="booking-card-body">
              <h3 className="booking-title">Step 1 · Book the Seat</h3>
              <p className="booking-subtitle">
                Click &quot;Book&quot; to start the 10-minute timer and generate a booking ID to share with the payments operator.
              </p>

              <div className="booking-field-row booking-field-row-center">
                <label className="form-label booking-field-label" htmlFor="eventId">
                  Event / Table ID
                </label>
                <input
                  id="eventId"
                  type="text"
                  className="form-input booking-field-input"
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  placeholder="e.g. TABLE_5"
                />
              </div>

              {currentBooking && (
                <div className="booking-info">
                  <div className="booking-info-row">
                    <span className="booking-info-label">Booking ID</span>
                    <span className="booking-info-value">{currentBooking.id}</span>
                  </div>
                  <div className="booking-info-row">
                    <span className="booking-info-label">Event</span>
                    <span className="booking-info-value">{currentBooking.eventId}</span>
                  </div>
                  <div className="booking-info-row">
                    <span className="booking-info-label">Time left</span>
                    <span className="booking-info-countdown">{formatCountdown(timeLeft)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="booking-card-actions">
              <button
                type="button"
                className="submit-button booking-button"
                onClick={handleBook}
                disabled={bookingLoading}
              >
                {bookingLoading ? 'Booking...' : 'Book (Start 10‑minute timer)'}
              </button>

              {bookingError && <p className="booking-error">{bookingError}</p>}
            </div>
          </div>

          <div className="booking-card">
            <div className="booking-card-body">
              <h3 className="booking-title">Step 2 · Confirm Payment</h3>
              <p className="booking-subtitle">
                Once RLUSD is visible on the ledger, enter the transaction hash and confirm the booking.
              </p>

              <div className="booking-field-row">
                <label className="form-label booking-field-label" htmlFor="bookingId">
                  Booking ID
                </label>
                <input
                  id="bookingId"
                  type="text"
                  className="form-input booking-field-input"
                  value={currentBooking?.id ?? ''}
                  readOnly
                  placeholder="Booking ID will appear after Step 1"
                />
              </div>

              <div className="booking-field-row">
                <label className="form-label booking-field-label" htmlFor="txHash">
                  Transaction Hash (tx hash)
                </label>
                <input
                  id="txHash"
                  type="text"
                  className="form-input booking-field-input"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Paste the RLUSD payment transaction hash"
                />
              </div>
            </div>

            <div className="booking-card-actions">
              <button
                type="button"
                className="submit-button booking-button"
                onClick={handleConfirmPayment}
                disabled={!currentBooking || !txHash || confirmLoading}
              >
                {confirmLoading ? 'Confirming...' : 'Confirm Payment'}
              </button>

              {confirmMessage && <p className="booking-success">{confirmMessage}</p>}
              {confirmError && <p className="booking-error">{confirmError}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          Create Escrow
        </button>
        <button
          className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
          onClick={() => setActiveTab('manage')}
        >
          Manage Escrows
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="create-escrow-section">
          <div className="section-header">
            <h2 className="section-title">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8.33333H14.1667V6.66667C14.1667 4.08934 12.0773 2 9.5 2C6.92267 2 4.83333 4.08934 4.83333 6.66667V8.33333H4C3.07952 8.33333 2.33333 9.07952 2.33333 10V16.6667C2.33333 17.5871 3.07952 18.3333 4 18.3333H15C15.9205 18.3333 16.6667 17.5871 16.6667 16.6667V10C16.6667 9.07952 15.9205 8.33333 15 8.33333ZM6.5 6.66667C6.5 4.82572 8.15905 3.16667 10 3.16667C11.841 3.16667 13.5 4.82572 13.5 6.66667V8.33333H6.5V6.66667ZM15 16.6667H4V10H15V16.6667Z" fill="currentColor"/>
              </svg>
              Create New Escrow
            </h2>
            <p className="section-description">
              Set up a conditional payment that will be held in escrow until the specified conditions are met.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="escrow-form">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="amount" className="form-label">
                  Amount (XRP) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="destinationAddress" className="form-label">
                  Destination Address <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="destinationAddress"
                  name="destinationAddress"
                  value={formData.destinationAddress}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="finishAfter" className="form-label">
                  Finish After <span className="required">*</span>
                </label>
                <div className="date-input-container">
                  <input
                    type="datetime-local"
                    id="finishAfter"
                    name="finishAfter"
                    value={formData.finishAfter}
                    onChange={handleInputChange}
                    className="form-input date-input"
                    required
                  />
                </div>
                <p className="form-helper">Earliest time the escrow can be finished</p>
              </div>

              <div className="form-group">
                <label htmlFor="cancelAfter" className="form-label">
                  Cancel After (Optional)
                </label>
                <div className="date-input-container">
                  <input
                    type="datetime-local"
                    id="cancelAfter"
                    name="cancelAfter"
                    value={formData.cancelAfter}
                    onChange={handleInputChange}
                    className="form-input date-input"
                  />
                </div>
                <p className="form-helper">Time after which the escrow can be cancelled</p>
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="condition" className="form-label">
                  Condition (Optional)
                </label>
                <input
                  type="text"
                  id="condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="Crypto-condition in hexadecimal format"
                />
                <p className="form-helper">Crypto-condition in hexadecimal format (PREIMAGE-SHA-256)</p>
              </div>
            </div>

            <button type="submit" className="submit-button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 8.33333H14.1667V6.66667C14.1667 4.08934 12.0773 2 9.5 2C6.92267 2 4.83333 4.08934 4.83333 6.66667V8.33333H4C3.07952 8.33333 2.33333 9.07952 2.33333 10V16.6667C2.33333 17.5871 3.07952 18.3333 4 18.3333H15C15.9205 18.3333 16.6667 17.5871 16.6667 16.6667V10C16.6667 9.07952 15.9205 8.33333 15 8.33333ZM6.5 6.66667C6.5 4.82572 8.15905 3.16667 10 3.16667C11.841 3.16667 13.5 4.82572 13.5 6.66667V8.33333H6.5V6.66667ZM15 16.6667H4V10H15V16.6667Z" fill="currentColor"/>
              </svg>
              Create Escrow
            </button>
          </form>
        </div>
      )}

      {activeTab === 'manage' && (
        <div className="manage-escrow-section">
          {escrows.length === 0 ? (
            <div className="empty-state">
              <p>No escrows found. Create your first escrow to get started.</p>
            </div>
          ) : (
            escrows.map((escrow) => (
              <div key={escrow.id} className="escrow-card">
                <div className="escrow-header">
                  <div className="escrow-id-section">
                    <h3 className="escrow-id">{escrow.id}</h3>
                    <div className={`status-badge status-${escrow.status}`}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 1.16667C3.775 1.16667 1.16667 3.775 1.16667 7C1.16667 10.225 3.775 12.8333 7 12.8333C10.225 12.8333 12.8333 10.225 12.8333 7C12.8333 3.775 10.225 1.16667 7 1.16667ZM7 11.6667C4.42167 11.6667 2.33333 9.57833 2.33333 7C2.33333 4.42167 4.42167 2.33333 7 2.33333C9.57833 2.33333 11.6667 4.42167 11.6667 7C11.6667 9.57833 9.57833 11.6667 7 11.6667ZM7.58333 4.66667H6.41667V7.58333H9.33333V6.41667H7.58333V4.66667Z" fill="currentColor"/>
                      </svg>
                      <span>{escrow.status}</span>
                    </div>
                  </div>
                  <div className="escrow-amount">
                    {escrow.amount} XRP
                  </div>
                </div>
                
                <div className="escrow-created">
                  Created {formatDateTime(escrow.createdAt)}
                </div>

                <div className="escrow-details">
                  <div className="escrow-detail-group">
                    <label className="escrow-detail-label">Destination</label>
                    <div className="escrow-input-container">
                      <input
                        type="text"
                        value={escrow.destinationAddress}
                        readOnly
                        className="escrow-input"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(escrow.destinationAddress)}
                        className="copy-button"
                        aria-label="Copy destination address"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.5 3.5H3.5C2.67157 3.5 2 4.17157 2 5V12.5C2 13.3284 2.67157 14 3.5 14H11C11.8284 14 12.5 13.3284 12.5 12.5V10.5M5.5 3.5C5.5 2.67157 6.17157 2 7 2H9.5C10.3284 2 11 2.67157 11 3.5V6C11 6.82843 10.3284 7.5 9.5 7.5H7C6.17157 7.5 5.5 6.82843 5.5 6V3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="escrow-detail-group">
                    <label className="escrow-detail-label">Finish After</label>
                    <div className="escrow-input-container">
                      <div className="escrow-input-wrapper">
                        <input
                          type="datetime-local"
                          value={formatDateTimeLocal(escrow.finishAfter)}
                          readOnly
                          className="escrow-input"
                        />
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="calendar-icon">
                          <path d="M12.6667 2.66667H12V1.33333C12 0.965333 11.7013 0.666667 11.3333 0.666667C10.9653 0.666667 10.6667 0.965333 10.6667 1.33333V2.66667H5.33333V1.33333C5.33333 0.965333 5.03467 0.666667 4.66667 0.666667C4.29867 0.666667 4 0.965333 4 1.33333V2.66667H3.33333C2.22867 2.66667 1.33333 3.562 1.33333 4.66667V13.3333C1.33333 14.438 2.22867 15.3333 3.33333 15.3333H12.6667C13.7713 15.3333 14.6667 14.438 14.6667 13.3333V4.66667C14.6667 3.562 13.7713 2.66667 12.6667 2.66667ZM12.6667 13.3333H3.33333V7.33333H12.6667V13.3333ZM3.33333 6V4.66667H12.6667V6H3.33333Z" fill="currentColor"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="escrow-actions">
                  <button
                    type="button"
                    onClick={() => handleFinishEscrow(escrow.id)}
                    className="action-button finish-button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M15 8.33333H14.1667V6.66667C14.1667 4.08934 12.0773 2 9.5 2C6.92267 2 4.83333 4.08934 4.83333 6.66667V8.33333H4C3.07952 8.33333 2.33333 9.07952 2.33333 10V16.6667C2.33333 17.5871 3.07952 18.3333 4 18.3333H15C15.9205 18.3333 16.6667 17.5871 16.6667 16.6667V10C16.6667 9.07952 15.9205 8.33333 15 8.33333ZM6.5 6.66667C6.5 4.82572 8.15905 3.16667 10 3.16667C11.841 3.16667 13.5 4.82572 13.5 6.66667V8.33333H6.5V6.66667ZM15 16.6667H4V10H15V16.6667Z" fill="currentColor"/>
                    </svg>
                    Finish Escrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelEscrow(escrow.id)}
                    className="action-button cancel-button"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM13.7071 12.2929C14.0976 12.6834 14.0976 13.3166 13.7071 13.7071C13.3166 14.0976 12.6834 14.0976 12.2929 13.7071L10 11.4142L7.70711 13.7071C7.31658 14.0976 6.68342 14.0976 6.29289 13.7071C5.90237 13.3166 5.90237 12.6834 6.29289 12.2929L8.58579 10L6.29289 7.70711C5.90237 7.31658 5.90237 6.68342 6.29289 6.29289C6.68342 5.90237 7.31658 5.90237 7.70711 6.29289L10 8.58579L12.2929 6.29289C12.6834 5.90237 13.3166 5.90237 13.7071 6.29289C14.0976 6.68342 14.0976 7.31658 13.7071 7.70711L11.4142 10L13.7071 12.2929Z" fill="currentColor"/>
                    </svg>
                    Cancel Escrow
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="about-section">
        <h3 className="about-title">About XRP Ledger Escrow</h3>
        <div className="about-content">
          <div className="about-item">
            <strong>Time-based Escrow:</strong> Funds are held until a specific time has passed. Use{' '}
            <span className="highlight">FinishAfter</span> to set when the escrow can be executed.
          </div>
          <div className="about-item">
            <strong>Conditional Escrow:</strong> Funds are held until a cryptographic condition is met. Use{' '}
            <span className="highlight">PREIMAGE-SHA-256 crypto-conditions</span> for secure, verifiable releases.
          </div>
          <div className="about-item">
            <strong>Cancellation:</strong> Set a <span className="highlight">CancelAfter</span> time to allow the sender to reclaim funds if the escrow isn't finished by that time.
          </div>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-right">
          <button className="help-button" aria-label="Help">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2ZM10 16C6.68629 16 4 13.3137 4 10C4 6.68629 6.68629 4 10 4C13.3137 4 16 6.68629 16 10C16 13.3137 13.3137 16 10 16Z" fill="currentColor"/>
              <path d="M10 6C9.44772 6 9 6.44772 9 7V10C9 10.5523 9.44772 11 10 11C10.5523 11 11 10.5523 11 10V7C11 6.44772 10.5523 6 10 6Z" fill="currentColor"/>
              <path d="M10 12C9.44772 12 9 12.4477 9 13C9 13.5523 9.44772 14 10 14C10.5523 14 11 13.5523 11 13C11 12.4477 10.5523 12 10 12Z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
