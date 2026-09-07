import logo from '../assets/hf-logo.png'

export default function BrandMark({ className = 'h-8 w-8' }) {
  return (
    <img
      src={logo}
      alt=""
      className={`bg-transparent object-contain ${className}`}
    />
  )
}
