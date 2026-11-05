import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ApiUtilService } from '../../utils/api-util/api-util.service'

@Injectable()
export class FormatResponseInterceptor implements NestInterceptor {
  constructor(private readonly apiUtilService: ApiUtilService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((rawData) => {
        if (rawData && typeof rawData === 'object' && 'message' in rawData) {
          const { message, ...rest } = rawData as Record<string, any>
          const data = Object.keys(rest).length > 0 ? rest : null
          return this.apiUtilService.formatResponse({ data, message })
        }
        return this.apiUtilService.formatResponse({ data: rawData })
      }),
    )
  }
}
