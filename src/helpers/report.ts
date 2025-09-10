import { checkIfErrorDismissable } from '@helpers/error'
import { bot } from '@helpers/bot'
import { sanitizeInput, validateChatId } from '@helpers/validation'
import * as mongoose from 'mongoose'
import {Mongoose, Schema} from "mongoose";

let errorsToReport: string[] = []

async function bulkReport() {
  const tempErrorsToReport = errorsToReport
  errorsToReport = []
  const reportChatId = process.env.REPORT_CHAT_ID
  if (!reportChatId || !validateChatId(reportChatId)) {
    return
  }
  if (tempErrorsToReport.length > 0) {
    const reportText = tempErrorsToReport.reduce(
      (prev, cur) => `${prev}${sanitizeInput(cur)}\n`,
      ''
    )
    const chunks = reportText.match(/[\s\S]{1,4000}/g) || []
    for (const chunk of chunks) {
      try {
        await bot.telegram.sendMessage(reportChatId, chunk)
      } catch (err) {
        console.error('Failed to send error report:', err)
      }
    }
  }
}

setInterval(bulkReport, 60 * 1000)

export function report(error: Error, reason?: string) {
  if (checkIfErrorDismissable(error)) {
    return
  }
  
  // Sanitize error messages to prevent log injection
  const sanitizedMessage = sanitizeInput(error.message || 'Unknown error')
  const sanitizedReason = reason ? sanitizeInput(reason) : ''
  
  console.error(sanitizedReason, sanitizedMessage)
  
  // Limit error queue size to prevent memory issues
  if (errorsToReport.length < 100) {
    errorsToReport.push(`${sanitizedReason ? `${sanitizedReason}\n` : ''}${sanitizedMessage}`)
  }
}

mongoose.plugin(log)

function log(schema: Schema) {
  const handleError = (error: any, doc: any, next: Function) => {
    if (error?.errmsg || error?.message) {
      const sanitizedError = sanitizeInput(error.errmsg || error.message || 'Database error')
      // Limit database error queue size
      if (errorsToReport.length < 100) {
        errorsToReport.push(`global db error\n${sanitizedError}`)
      }
      return next(error);
    }
    next();
  };
  schema.post('validate', handleError);
  schema.post('save', handleError);
  schema.post('update', handleError);
  schema.post('insertMany', handleError);
  schema.post('find', handleError);
  schema.post('findOne', handleError);
  schema.post('findOneAndUpdate', handleError);
  schema.post('findOneAndRemove', handleError);
}
