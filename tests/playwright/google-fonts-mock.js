const mockCss = `
@font-face {
  font-family: 'Mocked Google Font';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url(data:font/woff2;base64,d09GMgABAAAAAA) format('woff2');
}
`

module.exports = new Proxy(
  {},
  {
    get() {
      return mockCss
    },
  }
)
