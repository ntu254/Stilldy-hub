import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export type SystemSettingDocument = HydratedDocument<SystemSetting>

@Schema({ timestamps: true, collection: 'system_settings' })
export class SystemSetting {
  @Prop({ required: true, unique: true })
  key!: string

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  value!: any

  @Prop({ type: String, default: null })
  description?: string | null
}

export const SystemSettingSchema = SchemaFactory.createForClass(SystemSetting)
