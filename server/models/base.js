import inflection from 'inflection';
import _ from 'lodash';
import path from 'path';

import s3 from '#lib/s3.js';

class Base {
  constructor (fields, data) {
    if (!data) {
      return null;
    }
    const changes = new Set();
    this.changes = changes;
    // Store fields and data for toJSON() method
    this.__fields = fields;
    this.__data = data;

    this.update = function (attributes) {
      _.forIn(attributes, (value, key) => {
        if (Object.hasOwn(fields, key)) {
          this[key] = value;
        }
      });
    };

    return new Proxy(this, {
      get (target, property, receiver) {
        // if the property is in the schema, return it from the data object
        if (Object.hasOwn(fields, property) || Object.hasOwn(data, `${property.toString()}Id`)) {
          return data[property];
        }
        // otherwise, dispatch it to the target with the proxy as this
        const { get, value } =
          Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(target),
            property
          ) ?? {};
        // handle property accessor
        if (get) {
          return get.call(receiver);
        }
        // handle function
        if (value) {
          return value.bind(receiver);
        }
        // otherwise, return value directly off of target
        return target[property];
      },
      set (target, property, value, receiver) {
        // if the property is in the schema, set it in the data object
        if (Object.hasOwn(fields, property)) {
          if (data[property] !== value) {
            changes.add(property);
          }
          data[property] = value;
          return true;
        }
        // otherwise, set on target with proxy as this
        const descriptor =
          Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(target),
            property
          ) ?? {};
        const { set } = descriptor;
        if (set) {
          set.call(receiver, value);
          return true;
        }
        target[property] = value;
        return true;
      },
    });
  }

  get __CLASSNAME__ () {
    return this.constructor.name;
  }

  getAssetDirPath (attribute) {
    return `${inflection.tableize(this.__CLASSNAME__)}/${this.id}/${attribute}`;
  }

  getAssetUrl (attribute) {
    const assetDirPath = this.getAssetDirPath(attribute);
    const file = this[attribute];
    if (file) {
      return path.resolve('/api/assets/', assetDirPath, file);
    }
    return null;
  }

  async getAsset (attribute) {
    const assetDirPath = this.getAssetDirPath(attribute);
    let filePath = this[attribute];
    if (!filePath) {
      return null;
    }
    filePath = path.join(assetDirPath, filePath);
    filePath = await s3.getObject(filePath);
    return filePath;
  }

  setAsset (attribute, newValue) {
    const value = this[attribute];
    if (value === newValue) {
      return;
    }
    this[attribute] = newValue;
    return async (callback) => {
      const assetDirPath = this.getAssetDirPath(attribute);
      let prevPath;
      let newPath;
      if (value) {
        prevPath = path.join(assetDirPath, value);
        await s3.deleteObject(prevPath);
      }
      if (newValue) {
        newPath = path.join(assetDirPath, newValue);
        await s3.copyObject(path.join(process.env.AWS_S3_BUCKET, '_uploads', newValue), newPath);
        await s3.deleteObject(path.join('_uploads', newValue));
      }
      if (callback) {
        await callback(this.id, prevPath, newPath);
      }
    };
  }

  toJSON () {
    // Return a copy of the internal data object
    // The Proxy pattern stores data in __data, so we return that directly
    if (this.__data) {
      return { ...this.__data };
    }
    // Fallback: extract properties through the proxy
    const result = {};
    if (this.__fields) {
      for (const key in this.__fields) {
        if (Object.hasOwn(this.__fields, key)) {
          result[key] = this[key];
        }
      }
    }
    return result;
  }
}
export default Base;
