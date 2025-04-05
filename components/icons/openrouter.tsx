import { SVGProps } from "react"

export default function OpenRouter(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="33"
      height="32"
      viewBox="0 0 33 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M16.5 32C25.3366 32 32.5 24.8366 32.5 16C32.5 7.16344 25.3366 0 16.5 0C7.66344 0 0.5 7.16344 0.5 16C0.5 24.8366 7.66344 32 16.5 32Z"
        fill="url(#paint0_linear_openrouter)"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.5 27C22.299 27 27 22.299 27 16.5C27 10.701 22.299 6 16.5 6C10.701 6 6 10.701 6 16.5C6 22.299 10.701 27 16.5 27ZM16.5 24C20.6421 24 24 20.6421 24 16.5C24 12.3579 20.6421 9 16.5 9C12.3579 9 9 12.3579 9 16.5C9 20.6421 12.3579 24 16.5 24Z"
        fill="white"
      />
      <defs>
        <linearGradient
          id="paint0_linear_openrouter"
          x1="16.5"
          y1="0"
          x2="16.5"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#1F63FF" />
          <stop offset="1" stopColor="#0037B3" />
        </linearGradient>
      </defs>
    </svg>
  )
} 