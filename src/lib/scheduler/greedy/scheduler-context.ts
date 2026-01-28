import type {
    SchedulerInput,
    EmployeeScheduleState,
    GeneratedShift,
} from "../types";
import { ShiftManager } from "./shift-manager";
import { CandidateScorer } from "./scoring-engine";
import { CandidateFinder } from "./candidate-finder";

export interface SchedulerContext {
    input: SchedulerInput;
    employeeStates: Map<string, EmployeeScheduleState>;
    dailyStaffing: Map<string, GeneratedShift[]>;
    dailyTemplateStaffing: Map<string, Map<string, GeneratedShift[]>>;
    allWorkingDays: string[];
    weekendDaysSet: Set<string>;
    tradingSundaysSet: Set<string>;
    saturdaysSet: Set<string>;
    shiftManager: ShiftManager;
    scorer: CandidateScorer;
    candidateFinder: CandidateFinder;
}
