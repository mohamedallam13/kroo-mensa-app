const request = {
  page: "index",
}

const siteParams = {
  title: "KROO Cafe Menu",
  favIcon: HELPERS.getFavIconFromLink("https://drive.google.com/file/d/1JDO6dqyJ8U6hrIuzDk31VibFtIIs5Pd_/view?usp=sharing") 
}

function doGet(e) {
  const params = e.parameters || {}
  console.log(params)
  params.debugMode = params.debugMode || null
  const { page, props = {} } = request
  return _R(page, { ...props, ...params }, { ...siteParams, metaData: [{ name: "viewport", content: "width=device-width, initial-scale=1" }] })
}

