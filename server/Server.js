const request = {
  page: "index",
}

function doGet(e) {
  const params = e.parameters || {}
  console.log(params)
  const { page, props = {} } = request
  return _R(page, { ...props, ...params }, { metaData: [{ name: "viewport", content: "width=device-width, initial-scale=1" }] })
}

