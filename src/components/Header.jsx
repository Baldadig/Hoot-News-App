import { OwlMark, RefreshIcon, MenuIcon } from './icons.jsx'

export default function Header({ onRefresh, refreshing, onMenu }) {
  return (
    <header className="header">
      <div className="header__inner">
        <div className="header__left">
          <button className="iconbtn" onClick={onMenu} aria-label="Menu openen">
            <MenuIcon />
          </button>
          <div className="brand">
            <OwlMark className="brand__mark" />
            <h1 className="brand__name">Hoot</h1>
          </div>
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
