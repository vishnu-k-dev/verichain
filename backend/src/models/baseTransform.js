/**
 * Shared toJSON transform: expose `id`, drop `_id`/`__v`, and never leak
 * sensitive fields (passwordHash, refreshTokenHash).
 */
export const baseToJSON = {
  virtuals: true,
  versionKey: false,
  transform(_doc, ret) {
    ret.id = ret._id?.toString?.() ?? ret._id;
    delete ret._id;
    delete ret.passwordHash;
    delete ret.refreshTokenHash;
    return ret;
  },
};

export default baseToJSON;
