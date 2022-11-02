let mcomparator: string[] = ["LT", "GT", "EQ"];
let mfield: string[] = ["avg", "pass", "fail", "audit", "year"];
let sfield: string[] = ["dept", "id", "instructor", "title", "uuid"];
let matchExact = new RegExp(/^[*]{0}[^*]*[*]{0}$/);
let matchEnd = new RegExp(/^[*]{1}[^*]*[*]{0}$/);
let matchStart = new RegExp(/^[*]{0}[^*]*[*]{1}$/);
let matchContains = new RegExp(/^[*]{1}[^*]*[*]{1}$/);
let matchEdge = new RegExp(/^[*]{1}[*]{0,1}$/);
let asterisksFilter = new RegExp(/\*/g);

export class QueryFilterProcessor {

    public applyFilter(query: any, addedData: any): boolean {
        if (Object.keys(query).length === 0) {
            return true;
        }
        let filter: string = Object.keys(query)[0];
        if (filter === "AND") {
            return this.applyAnd(query[filter], addedData);
        } else if (filter === "OR") {
            return this.applyOr(query[filter], addedData);
        } else if (mcomparator.includes(filter)) {
            return this.applyMcomp(filter, query[filter], addedData);
        } else if (filter === "IS") {
            return this.applyScomp(query[filter], addedData);
        } else if (filter === "NOT") {
            return !this.applyFilter(query[filter], addedData);
        }
        return false;
    }

    private applyAnd(query: any, addedData: any) {
        for (let filter of query) {
            if (!this.applyFilter(filter, addedData)) {
                return false;
            }
        }
        return true;
    }

    private applyOr(query: any, addedData: any) {
        for (let filter of query) {
            if (this.applyFilter(filter, addedData)) {
                return true;
            }
        }
        return false;
    }

    private applyMcomp(filter: any, query: any, addedData: any) {
        let mkey: string = Object.keys(query)[0];
        let splitMkey: string[] = mkey.split("_");
        let mcompNumber: any = query[mkey];
        switch (filter) {
            case "LT":
                return this.applyLessThan(splitMkey, mcompNumber, addedData);
            case "GT":
                return this.applyGreaterThan(splitMkey, mcompNumber, addedData);
            case "EQ":
                return this.applyEqual(splitMkey, mcompNumber, addedData);
        }
        return false;
    }

    private applyScomp(query: any, addedData: any) {
        let skey: string = Object.keys(query)[0];
        let splitSkey: string[] = skey.split("_");
        let inputString: any = query[skey];
        return this.applyIs(splitSkey, inputString, addedData);
    }

    private applyIs(splitSkey: string[], inputString: any, addedData: any) {
        switch (splitSkey[1]) {
            case "dept":
                return this.stringMatching(addedData["Subject"], inputString);
            case "id":
                return this.stringMatching(addedData["Course"], inputString);
            case "instructor":
                return this.stringMatching(addedData["Professor"], inputString);
            case "title":
                return this.stringMatching(addedData["Title"], inputString);
            case "uuid":
                return this.stringMatching(addedData["id"], inputString);
            case "fullname":
                return this.stringMatching(addedData["fullName"], inputString);
            case "shortname":
                return this.stringMatching(addedData["shortName"], inputString);
            case "number":
                return this.stringMatching(addedData["roomNumber"], inputString);
            case "name":
                return this.stringMatching(addedData["name"], inputString);
            case "address":
                return this.stringMatching(addedData["address"], inputString);
            case "type":
                return this.stringMatching(addedData["roomType"], inputString);
            case "furniture":
                return this.stringMatching(addedData["furniture"], inputString);
            case "href":
                return this.stringMatching(addedData["href"], inputString);
        }
    }

    private stringMatching(data: any, inputString: any) {
        if (matchEdge.test(inputString)) {
            return true;
        }
        let filteredInput: string = inputString.replace(asterisksFilter, "");
        if (matchExact.test(inputString)) {
            return data === filteredInput;
        } else if (matchEnd.test(inputString)) {
            return data.endsWith(filteredInput);
        } else if (matchStart.test(inputString)) {
            return data.startsWith(filteredInput);
        } else if (matchContains.test(inputString)) {
            return data.includes(filteredInput);
        }
    }

    private applyLessThan(splitMkey: any, mValue: number, addedData: any) {
        switch (splitMkey[1]) {
            case "avg":
                return addedData["Avg"] < mValue;
            case "pass":
                return addedData["Pass"] < mValue;
            case "fail":
                return addedData["Fail"] < mValue;
            case "audit":
                return addedData["Audit"] < mValue;
            case "year":
                return addedData["Year"] < mValue;
            case "lat":
                return addedData["lat"] < mValue;
            case "lon":
                return addedData["lon"] < mValue;
            case "seats":
                return addedData["capacity"] < mValue;
        }
    }

    private applyGreaterThan(splitMkey: any, mValue: number, addedData: any) {
        switch (splitMkey[1]) {
            case "avg":
                return addedData["Avg"] > mValue;
            case "pass":
                return addedData["Pass"] > mValue;
            case "fail":
                return addedData["Fail"] > mValue;
            case "audit":
                return addedData["Audit"] > mValue;
            case "year":
                return addedData["Year"] > mValue;
            case "lat":
                return addedData["lat"] > mValue;
            case "lon":
                return addedData["lon"] > mValue;
            case "seats":
                return addedData["capacity"] > mValue;
        }
    }

    private applyEqual(splitMkey: any, mValue: number, addedData: any) {
        switch (splitMkey[1]) {
            case "avg":
                return addedData["Avg"] === mValue;
            case "pass":
                return addedData["Pass"] === mValue;
            case "fail":
                return addedData["Fail"] === mValue;
            case "audit":
                return addedData["Audit"] === mValue;
            case "year":
                return addedData["Year"] === mValue;
            case "lat":
                return addedData["lat"] === mValue;
            case "lon":
                return addedData["lon"] === mValue;
            case "seats":
                return addedData["capacity"] === mValue;
        }
    }
}
