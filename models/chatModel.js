// import mongoose from "mongoose"

// const chatSchema = new mongoose.Schema(
//   {
//     userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
//     question: String,
//     answer: String,
//     intent: String,
//   },
//   { timestamps: true }
// )

// export default mongoose.model("Chat", chatSchema)

/////////////// for chat history 

import mongoose from "mongoose"

const chatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    conversationId: { type: String, default: () => new Date().getTime().toString() }, // Group related messages
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" }, // For threading
    question: String,
    answer: String,
    intent: String,
    status: {
      type: String,
      enum: ["sent", "delivered", "read", "failed"],
      default: "sent",
    },
    // sources: [
    //   {
    //     content: String,
    //     type: String,
    //     relevance: Number,
    //     metadata: mongoose.Schema.Types.Mixed,
    //   },
    // ],
    
    // metadata: {
    //   responseTime: Number, // milliseconds
    //   retrievedDocuments: Number,
    //   confidence: Number, // 0-1
    // },
  
  
    sources: [
      {
        content: {
          type: String,
          required: true,
          validate: {
            validator: function(v) {
              return v && v.trim().length > 0;
            },
            message: 'Source content cannot be empty'
          }
        },
        type: {
          type: String,
          default: 'unknown'
        },
        relevance: {
          type: Number,
          default: 0.5,
          min: 0,
          max: 1
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        }
      }
    ],
     metadata: {
      responseTime: Number,
      retrievedDocuments: Number,
      confidence: {
        type: Number,
        default: 0.5,
        min: 0,
        max: 1
      },
    },

  },
  { timestamps: true },
)

// Index for conversation threading
// chatSchema.index({ userId: 1, conversationId: 1, createdAt: -1 })

//  indexes and validations
chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ conversationId: 1, createdAt: -1 });
chatSchema.index({ "metadata.confidence": -1 });

//  virtual for conversation management
chatSchema.virtual('isAiMessage').get(function() {
  return !this.question && !!this.answer;
});

//  instance methods
chatSchema.methods.markAsRead = async function() {
  this.status = 'read';
  await this.save();
  await MessageStatus.findOneAndUpdate(
    { chatId: this._id },
    { status: 'read', readAt: new Date() }
  );
};


//  pre-save middleware to clean data
chatSchema.pre('save', function(next) {
  // Ensure sources array is properly formatted
  if (this.sources && Array.isArray(this.sources)) {
    this.sources = this.sources.map(source => {
      if (typeof source === 'string') {
        // Convert string sources to object format
        return {
          content: source,
          type: 'unknown',
          relevance: 0.5,
          metadata: {}
        };
      }
      return source;
    }).filter(source => source && source.content && source.content.trim().length > 0);
  }
  
  next();
});

export default mongoose.model("Chat", chatSchema)
