const asyncHandler = require('../middleware/asyncHandler')
const assetsModule = require('../modules/assets.module')

// GET /
const getSummary = asyncHandler(async (req, res) => {
  res.json(await assetsModule.getSummary())
})

// GET 
const getCategories = asyncHandler(async (req, res) => {
  res.json(await assetsModule.getCategories())
})

// GET 
const getAll = asyncHandler(async (req, res) => {
  res.json(await assetsModule.getAll(req.query))
})

// GET 
const getOne = asyncHandler(async (req, res) => {
  const asset = await assetsModule.getOne(req.params.id)
  if (!asset) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์' }
  res.json(asset)
})

// POST 
const create = asyncHandler(async (req, res) => {
  res.status(201).json(await assetsModule.create(req.body))
})

// PUT 
const update = asyncHandler(async (req, res) => {
  const asset = await assetsModule.update(req.params.id, req.body)
  if (!asset) throw { statusCode: 404, message: 'ไม่พบครุภัณฑ์' }
  res.json(asset)
})

// DELETE 
const remove = asyncHandler(async (req, res) => {
  await assetsModule.remove(req.params.id)
  res.json({ message: 'ลบครุภัณฑ์สำเร็จ' })
})

module.exports = { getSummary, getCategories, getAll, getOne, create, update, remove }
