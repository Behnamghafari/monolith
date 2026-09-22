import { Schema, model } from 'mongoose';
const schema = new Schema({ actorId: Schema.Types.ObjectId, action: String, resource: String, resourceId: String, changes: Schema.Types.Mixed, requestId: String }, { timestamps: true });
export const AuditLogModel = model('AuditLog', schema);
