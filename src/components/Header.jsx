import { OwlMark, RefreshIcon } from './icons.jsx'

export default function Header({ onRefresh, refreshing }) {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="brand">
          <OwlMark className="brand__mark" />
          <span className="brand__name">Hoot</span>
        </div>
        <button
          className={`iconbtn${refreshing ? ' iconbtn--spin' : ''}`}
          onClick={onRefresh}
          aria-label="Vernieuwen"
          disabled={refreshing}
        >
          <RefreshIcon />
        </button>
      </div>
    </header>
  )
}
