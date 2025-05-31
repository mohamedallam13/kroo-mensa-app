(function (root, factory) {
  root.MW = factory();
})(this, function () {
  function include(file, props = {}) {
    console.log(file);
    var template = HtmlService.createTemplateFromFile(file);
    Object.assign(template, props);
    return template.evaluate().getContent();
  }

  function render(file, props = {}, options = {}) {
    const { preventiFrameAll, favIcon, title, metaData } = options;
    const fileTemplate = HtmlService.createTemplateFromFile(file);
    Object.assign(fileTemplate, props);
    const HTMLOutput = fileTemplate.evaluate();
    if (!preventiFrameAll)
      HTMLOutput.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    if (favIcon) HTMLOutput.setFaviconUrl(favIcon);
    if (title) HTMLOutput.setTitle(title);
    if (metaData) addMetaData(HTMLOutput, metaData);
    console.log(HTMLOutput.getContent());
    return HTMLOutput;
  }

  function addMetaData(HTMLOutput, metaData) {
    metaData.forEach((metaTag) => {
      const { name, content } = metaTag;
      HTMLOutput.addMetaTag(name, content);
    });
  }

  return {
    include,
    render,
  };
});

function _I(file, props = {}) {
  return MW.include(file, props);
}

function _R(file, props = {}, options = {}) {
  return MW.render(file, props, options);
}
