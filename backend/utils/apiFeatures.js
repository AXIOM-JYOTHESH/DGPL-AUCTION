class APIfeature {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }
  // builds the querystring
  filter() {
    // tour.find only gives mongoose query object, and when there is
    // await then only it interacts with
    // our datatbase and gethe final documents  ....
    //console.log(req.query);
    // Build the query.. you can just pass the object with required fields , you will get answer..
    const queryObj = { ...this.queryString }; // here we are deep copying an object , so that org dont change
    const excludedFields = ['sort', 'limit', 'page', 'fields'];
    excludedFields.forEach((el) => delete queryObj[el]);
    // Advance Filtering adding gt lt operators..
    // we need to convert this into JSON file to replace th gt with $gt

    let queryStr = JSON.stringify(queryObj); // creates a JSON string
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);
    queryStr = JSON.parse(queryStr);

    this.query = this.query.find(queryStr);
    return this;
  }
  sorting() {
    if (this.queryString.sort) {
      // console.log(req.query.sort);
      // accepts 'price rating' if multiple are there ..
      const sortBy = this.queryString.sort.replace(/,/g, ' ');
      this.query = this.query.sort(sortBy);
    }
    return this;
  }
  limitFields() {
    // selecting only limited fields ..
    if (this.queryString.fields) {
      const fields = this.queryString.fields.replace(/,/g, ' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // -ve is used for exclude the only field ..
    }
    return this;
  }
  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}
module.exports = APIfeature;
