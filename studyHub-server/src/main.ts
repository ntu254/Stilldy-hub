import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { initApp } from './init'
import { AppModule } from './app.module'
import { LoggerModule } from './logger/logger/logger.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: LoggerModule.createLogger(),
  })

  const {
    PORT = 3000,
    HOST = 'localhost',
    APP_PREFIX = '/docs',
    APP_NAME = 'nestjs_app',
    NODE_ENV = 'development',
  } = process.env

  initApp(app)

  await app.listen(PORT, HOST)
  const protocol = NODE_ENV === 'production' ? 'https' : 'http'
  Logger.log(`Service is running at ${protocol}://${HOST}:${PORT}${APP_PREFIX}`, APP_NAME)
}
bootstrap()
