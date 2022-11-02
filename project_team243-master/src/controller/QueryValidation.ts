import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError} from "./IInsightFacade";
import {TransformationValidator} from "./TransformationValidator";
import {ValidationHelper} from "./ValidationHelper";
let transformations: string = "TRANSFORMATIONS";
let logic: string[] = ["AND", "OR"];
let mcomparator: string[] = ["LT", "GT", "EQ"];
let scomparison: string = "IS";
let negation: string = "NOT";
let direction: string[] = ["UP", "DOWN"];
let mfield: string[] = ["avg", "pass", "fail", "audit", "year", "lat", "lon", "seats"];
let sfield: string[] = ["dept", "id", "instructor", "title", "uuid"
, "fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];
let applyKeyTest = new RegExp(/^[^_]+$/);
let allFields: string[] = mfield.concat(sfield);

export class QueryValidation {
    private allRegularKeysInQuery: string[];
    private regularKeysInColumn: string[];
    private applyKeysInColumn: string[];
    private allKeysInColumn: string[];
    private allKeysInGroup: string[];
    private allKeysInApply: string[];
    private datasetsAdded: string[];
    private transformValidator: TransformationValidator;
    private HasTransformation: boolean;
    public idToQuery: string;

    constructor(datasets: string[]) {
        this.allRegularKeysInQuery = [];
        this.datasetsAdded = datasets;
        this.regularKeysInColumn = [];
        this.applyKeysInColumn = [];
        this.allKeysInGroup = [];
        this.allKeysInApply = [];
        this.idToQuery = "";
    }

    public checkQueryValidity(query: any): boolean {
        let mainQuery: string[] = Object.keys(query);
        if (mainQuery[0] === "WHERE" && mainQuery[1] === "OPTIONS" && mainQuery[2] !== "TRANSFORMATIONS") {
            this.HasTransformation = false;
            if (this.checkBodyValidity(query["WHERE"]) && this.checkOptionsValidity(query["OPTIONS"])) {
                return this.checkAllKeysSameID();
            } else {
                return false;
            }
        } else if (mainQuery[0] === "WHERE" && mainQuery[1] === "OPTIONS" && mainQuery[2] === "TRANSFORMATIONS") {
            this.HasTransformation = true;
            if (this.checkBodyValidity(query["WHERE"]) && this.checkOptionsValidity(query["OPTIONS"])) {
                this.transformValidator = new TransformationValidator(this.allRegularKeysInQuery, this.allKeysInColumn);
                if (this.transformValidator.checkTransformation(query[transformations]) && this.checkAllKeysSameID()) {
                    return this.transformValidator.checkTransformKeys();
                } else {
                    return false;
                }
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    public checkBodyValidity(queryElement: any): boolean {
        if (queryElement === null || queryElement === undefined) {
            return false;
        }
        let queryBody: string[] = Object.keys(queryElement);
        if (queryBody.length === 0) {
            return true;
        } else if (queryBody.length > 1) {
            return false;
        } else if (queryBody.length === 1) {
            return this.checkFilterValidity(queryElement);
        }
    }

    private checkFilterValidity(queryElement: any) {
        let queryFilter: string = Object.keys(queryElement)[0];
        if (queryElement[queryFilter] === null || queryElement[queryFilter] === undefined) {
            return false;
        }
        if (logic.includes(queryFilter)) {
            return this.checkLogicValidity(queryElement[queryFilter]);
        } else if (mcomparator.includes(queryFilter)) {
            return this.checkMcompValidity(queryElement[queryFilter]);
        } else if (scomparison === queryFilter) {
            return this.checkScompValidity(queryElement[queryFilter]);
        } else if (negation === queryFilter) {
            return this.checkNegateValidity(queryElement[queryFilter]);
        } else {
            return false;
        }
    }

    private checkLogicValidity(queryElement: any) {
        if (queryElement.length === 0) {
            return false;
        }
        for (let filter of queryElement) {
            if (this.checkFilterValidity(filter) === false) {
                return false;
            }
        }
        return true;
    }

    private checkMcompValidity(queryElement: any) {
        let mkeys: any = Object.keys(queryElement);
        if (queryElement === null || !(mkeys.length === 1)) {
            return false;
        }
        let mkey: string = Object.keys(queryElement)[0];
        this.allRegularKeysInQuery.push(mkey);
        let mcompNumber: any = queryElement[mkey];
        let splitMkey: string[] = mkey.split("_");
        if (splitMkey.length > 2 || splitMkey.length < 2 || splitMkey.includes("")) {
            return false;
        // Check to make sure mfield and number are valid
        } else if (splitMkey.length === 2 && mfield.includes(splitMkey[1])) { // add condition to check if in dataset
            return typeof mcompNumber === "number";
        } else {
            return false;
        }
    }

    private checkScompValidity(queryElement: any) {
        let skeys: any = Object.keys(queryElement);
        if (queryElement === null || skeys.length > 1 || skeys.length === 0) {
            return false;
        }
        let skey: string = Object.keys(queryElement)[0];
        this.allRegularKeysInQuery.push(skey);
        let inputString: any = queryElement[skey];
        let splitSkey: string[] = skey.split("_");
        if (splitSkey.length > 2 || splitSkey.length < 2 || splitSkey.includes("")) {
            return false;
        // Check to make sure sfield and inputstring are valid
        } else if (splitSkey.length === 2 && sfield.includes(splitSkey[1])) {
            if (typeof inputString === "string") {
                return this.checkInputStringValidity(inputString);
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private checkInputStringValidity(inputString: any) {
        let regexFilter = new RegExp(/^[*]?[^*]*[*]?$/);
        return regexFilter.test(inputString);
    }

    private checkNegateValidity(queryElement: any): boolean {
        let negationContent: string[] = Object.keys(queryElement);
        if (negationContent.length > 1) {
            return false;
        } else {
            return this.checkFilterValidity(queryElement);
        }
    }

    public checkOptionsValidity(queryElement: any): boolean {
        if (queryElement === null || queryElement === undefined) {
            return false;
        }
        let queryOptions: string[] = Object.keys(queryElement);
        if (queryOptions.length === 0 || queryOptions.length > 2) {
            return false;
        } else if (queryOptions.length === 1 && queryOptions[0] === "COLUMNS") {
            return this.checkColumnValidity(queryElement["COLUMNS"]);
            return false;
        } else if (queryOptions.length === 2 && queryOptions[0] === "COLUMNS" && queryOptions[1] === "ORDER") {
            return this.checkColumnValidity(queryElement["COLUMNS"]) && this.checkOrderValidity(queryElement["ORDER"]);
            return false;
        } else {
            return false;
        }
    }

    private checkColumnValidity(keys: any) {
        if (keys.length >= 1) {
            for (let key of keys) {
                if (this.checkColumnKeyValidity(key) === false) {
                    return false;
                }
            }
            this.allKeysInColumn = keys;
            return true;
        }
        return false;
    }

    private checkOrderValidity(queryElement: any): boolean {
        if (queryElement === null || undefined) {
            return false;
        }
        if (typeof queryElement === "string") {
            if (!this.HasTransformation) {
                this.allRegularKeysInQuery.push(queryElement);
            }
            return this.allKeysInColumn.includes(queryElement);
        }
        let sortOptions: string[] = Object.keys(queryElement);
        if (sortOptions.length !== 2) {
            return false;
        }
        if (sortOptions[0] === "dir" && sortOptions[1] === "keys") {
            let sortKeys: any[] = queryElement["keys"];
            if (direction.includes(queryElement["dir"]) && sortKeys !== null && sortKeys.length !== 0) {
                if (!this.checkOrderKeysValidity(queryElement["keys"])) {
                    return false;
                }
                return sortKeys.every((key) => this.allKeysInColumn.includes(key));
            } else {
                return false;
            }
        } else {
            return false;
        }
    }

    private checkColumnKeyValidity(key: any): boolean {
        if (typeof key === "string") {
            let splitKey: string[] = key.split("_");
            if (splitKey.length > 2 || splitKey.includes("")) {
                return false;
            } else if (splitKey.length === 2 && allFields.includes(splitKey[1])) {
                this.regularKeysInColumn.push(key);
                this.allRegularKeysInQuery.push(key);
                return true;
            } else if (splitKey.length === 1 && applyKeyTest.test(key)) {
                if (!this.HasTransformation) {
                    this.allRegularKeysInQuery.push(key);
                }
                this.applyKeysInColumn.push(key);
                return true;
            }
        }
        return false;
    }

    private checkOrderKeysValidity(keys: any) {
        if (!Array.isArray(keys)) {
            return false;
        }
        if (keys.length >= 1) {
            for (let key of keys) {
                if (this.checkOrderKeyValidity(key) === false) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }

    private checkOrderKeyValidity(key: any): boolean {
        if (typeof key === "string") {
            let splitKey: string[] = key.split("_");
            if (splitKey.length > 2 || splitKey.includes("")) {
                return false;
            } else if (splitKey.length === 2 && allFields.includes(splitKey[1])) {
                this.allRegularKeysInQuery.push(key);
                return true;
            } else if (splitKey.length === 1 && applyKeyTest.test(key)) {
                if (!this.HasTransformation) {
                    this.allRegularKeysInQuery.push(key);
                }
                return true;
            }
        }
        return false;
    }

    private checkAllKeysSameID(): boolean {
        let firstKey: string = this.allRegularKeysInQuery[0];
        let splitKey: string[] = firstKey.split("_");
        if (splitKey.length > 2 || splitKey.length < 2 || splitKey.includes("")) {
            return false;
        } else if (splitKey.length === 2 && this.datasetsAdded.includes(splitKey[0])) {
           return this.checkAllKeysInQuery(splitKey[0]);
        } else {
            return false;
        }
    }

    private checkAllKeysInQuery(firstKey: string): boolean {
        for (let key of this.allRegularKeysInQuery) {
            if (key.split("_")[0] !== firstKey) {
                return false;
            }
        }
        this.idToQuery = firstKey;
        let validationHelper = new ValidationHelper();
        return validationHelper.checkFromOnlyOneSet(this.allRegularKeysInQuery);
    }
}
