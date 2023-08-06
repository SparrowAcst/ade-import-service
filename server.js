const { app, config } = require('./src/javascript')

app.listen(config.service.port, () => {
  console.log(`** ADE IMPORT SERVICE starts at port ${config.service.port}`)
})
