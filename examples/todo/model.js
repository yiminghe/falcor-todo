import falcor from 'falcor/dist/falcor.browser';

var model = new falcor.Model({
  source: new falcor.HttpDataSource('/model.json')
}).batch();

window.model = model;

export default model;
