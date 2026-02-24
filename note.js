// <!-- Why We don’t embed transactions inside user because:
// Scalability
// Performance
// Auditing
// Real banking architecture
// MongoDB size limits
// Query efficiency -->




// MongoDB uses special dollar-prefixed operators for comparisons, ranges, etc.:$gt   → greater than
// $gte  → greater than or equal
// $lt   → less than
// $lte  → less than or equal
// $eq   → equal
// $ne   → not equal
// etc.


// Here’s a one-line explanation for each:$gt — MongoDB query operator meaning “greater than” (strictly bigger than a value)  
// $or — MongoDB logical operator meaning “match documents if ANY of the listed conditions are true”  
// lean — Mongoose method that returns plain JavaScript objects instead of full Mongoose documents (faster & uses less memory)  
// cursor — MongoDB/Mongoose object that lets you fetch query results one document at a time (streaming style, memory efficient for large result sets)  
// cursor.next() — Method on a cursor that asynchronously fetches and returns the next document in the result set (returns null when there are no more documents)

