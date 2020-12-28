'use strict';

/**
 * @private
 * @example
 * checkIsPropertyEditable(#{ a: 1, b: 2 }, 'a') === false;
 *
 * var objWithWritableAndNonConfigurableProp = Object.defineProperty({}, 'test', { value: 123, writable: true });
 * checkIsPropertyEditable(objWithWritableAndNonConfigurableProp, 'test') === true;
 * checkIsPropertyEditable(objWithWritableAndNonConfigurableProp, 'test', { isForDefineProperty: true }) === false;
 *
 * var sealedObj = Object.seal(Object.defineProperty({}, 'test', { value: 123, writable: true }));
 * checkIsPropertyEditable(sealedObj, 'test') === true;
 * checkIsPropertyEditable(sealedObj, 'otherProp') === false;
 *
 * var objWithReadonly = Object.defineProperty({}, 'test', { get(){ return 123 } });
 * checkIsPropertyEditable(objWithReadonly, 'test') === false;
 *
 * var objWithGetSet = Object.defineProperty({ _test: 123 }, 'test', { get(){ return this._test }, set(test){ this._test = test } });
 * checkIsPropertyEditable(objWithGetSet, 'test') === true;
 */
export function checkIsPropertyEditable(obj: Object, propertyName: string, options?: { isForDefineProperty?: boolean }) {
    if (Object.isFrozen(obj)) {
        return false;
    }

    const propertyDescriptor = Object.getOwnPropertyDescriptor(obj, propertyName);

    if (!propertyDescriptor) {
        if (Object.isSealed(obj)) {
            // Can't add new property to sealed object
            return false;
        }

        // No descriptor + object is not frozen/sealed, so 100% we can add property
        return true;
    }

    // Can't use Object.defineProperty for props with configurable === false
    if (options?.isForDefineProperty && propertyDescriptor.configurable !== void 0) {
        // ignore `propertyDescriptors.writable` here
        return propertyDescriptor.configurable;
    }

    if (propertyDescriptor.set) {
        return true;
    }

    if (propertyDescriptor.get) {
        return !!propertyDescriptor.set;
    }

    return !!propertyDescriptor.writable;
}
