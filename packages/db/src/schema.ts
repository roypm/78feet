import { memberAuthUser, staffAuthUser } from "./auth-schema.ts";
import { pgTable, uuid, text, integer, boolean, timestamp, index, foreignKey, check, uniqueIndex, date, time, jsonb, pgEnum, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export const bookingPool = pgEnum("BookingPool", ['quota_directed', 'quota_open', 'pack'])
export const bookingStatus = pgEnum("BookingStatus", ['active', 'cancelled'])
export const classKind = pgEnum("ClassKind", ['directed', 'open'])
export const endedReason = pgEnum("EndedReason", ['change', 'cancelled'])
export const instanceStatus = pgEnum("InstanceStatus", ['scheduled', 'cancelled'])
export const paymentBilling = pgEnum("PaymentBilling", ['monthly', 'quarterly', 'semiannual', 'annual', 'one_time'])
export const quotaPeriod = pgEnum("QuotaPeriod", ['week', 'month'])
export const role = pgEnum("Role", ['member', 'coach', 'admin'])
export const tariffBilling = pgEnum("TariffBilling", ['monthly', 'quarterly', 'semiannual', 'annual', 'none', 'one_time'])
export const tariffConsumption = pgEnum("TariffConsumption", ['weekly_quota', 'pack', 'monthly_quota'])
export const userStatus = pgEnum("UserStatus", ['active', 'inactive'])
export const userTheme = pgEnum("UserTheme", ['light', 'dark', 'system'])


export const tariff = pgTable("tariff", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	priceCents: integer("price_cents").notNull(),
	quotaDirected: integer("quota_directed").default(0),
	quotaOpen: integer("quota_open").default(0),
	packClasses: integer("pack_classes"),
	active: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	consumptionModel: tariffConsumption("consumption_model").notNull(),
	billingPeriod: tariffBilling("billing_period").notNull(),
});

export const creditGrant = pgTable("credit_grant", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	quantity: integer().notNull(),
	paymentId: uuid("payment_id"),
	note: text(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("credit_grant_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "credit_grant_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "credit_grant_created_by_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.paymentId],
			foreignColumns: [payment.id],
			name: "credit_grant_payment_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	check("credit_grant_quantity_nonzero", sql`quantity <> 0`),
]);

export const payment = pgTable("payment", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	periodStart: date("period_start"),
	amountCents: integer("amount_cents").notNull(),
	method: text(),
	recordedBy: uuid("recorded_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	billingPeriod: paymentBilling("billing_period").notNull(),
	paymentBoxId: uuid("payment_box_id").notNull(),
}, (table) => [
	uniqueIndex("payment_one_period").using("btree", table.userId.asc().nullsLast(), table.billingPeriod.asc().nullsLast(), table.periodStart.asc().nullsLast()).where(sql`(billing_period <> 'one_time'::"PaymentBilling")`),
	index("payment_payment_box_id_created_at_idx").using("btree", table.paymentBoxId.asc().nullsLast(), table.createdAt.desc().nullsFirst()),
	index("payment_user_id_month_idx").using("btree", table.userId.asc().nullsLast(), table.periodStart.asc().nullsLast()),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "payment_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.recordedBy],
			foreignColumns: [user.id],
			name: "payment_recorded_by_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.paymentBoxId],
			foreignColumns: [box.id],
			name: "payment_payment_box_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const booking = pgTable("booking", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instanceId: uuid("instance_id").notNull(),
	userId: uuid("user_id").notNull(),
	pool: bookingPool().notNull(),
	status: bookingStatus().notNull(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'date' }),
	cancelledBy: uuid("cancelled_by"),
	quotaReturned: boolean("quota_returned"),
}, (table) => [
	index("booking_instance_id_idx").using("btree", table.instanceId.asc().nullsLast()),
	uniqueIndex("booking_one_active").using("btree", table.instanceId.asc().nullsLast(), table.userId.asc().nullsLast()).where(sql`(status = 'active'::"BookingStatus")`),
	index("booking_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	foreignKey({
			columns: [table.instanceId],
			foreignColumns: [classInstance.id],
			name: "booking_instance_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "booking_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "booking_created_by_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.cancelledBy],
			foreignColumns: [user.id],
			name: "booking_cancelled_by_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const classTemplate = pgTable("class_template", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	weekday: integer().notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	coachId: uuid("coach_id"),
	defaultCapacity: integer("default_capacity").notNull(),
	active: boolean().default(true).notNull(),
	classTypeId: uuid("class_type_id").notNull(),
	boxId: uuid("box_id").notNull(),
}, (table) => [
	index("class_template_box_id_idx").using("btree", table.boxId.asc().nullsLast()),
	foreignKey({
			columns: [table.coachId],
			foreignColumns: [user.id],
			name: "class_template_coach_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "class_template_class_type_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.boxId],
			foreignColumns: [box.id],
			name: "class_template_box_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	check("class_template_weekday_iso", sql`(weekday >= 1) AND (weekday <= 7)`),
	check("class_template_time_order", sql`end_time > start_time`),
]);

export const membership = pgTable("membership", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tariffId: uuid("tariff_id").notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'date' }).notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'date' }),
	endedReason: endedReason("ended_reason"),
}, (table) => [
	uniqueIndex("membership_one_current").using("btree", table.userId.asc().nullsLast()).where(sql`(ended_at IS NULL)`),
	index("membership_user_id_idx").using("btree", table.userId.asc().nullsLast()),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "membership_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.tariffId],
			foreignColumns: [tariff.id],
			name: "membership_tariff_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const classInstance = pgTable("class_instance", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	templateId: uuid("template_id"),
	date: date().notNull(),
	startAt: timestamp("start_at", { withTimezone: true, mode: 'date' }).notNull(),
	endAt: timestamp("end_at", { withTimezone: true, mode: 'date' }).notNull(),
	kind: classKind().notNull(),
	coachId: uuid("coach_id"),
	capacity: integer().notNull(),
	status: instanceStatus().notNull(),
	editedAt: timestamp("edited_at", { withTimezone: true, mode: 'date' }),
	cancelReason: text("cancel_reason"),
	classTypeId: uuid("class_type_id").notNull(),
	trainingId: uuid("training_id"),
	boxId: uuid("box_id").notNull(),
}, (table) => [
	index("class_instance_box_id_idx").using("btree", table.boxId.asc().nullsLast()),
	index("class_instance_date_idx").using("btree", table.date.asc().nullsLast()),
	uniqueIndex("class_instance_template_date").using("btree", table.templateId.asc().nullsLast(), table.date.asc().nullsLast()).where(sql`(template_id IS NOT NULL)`),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [classTemplate.id],
			name: "class_instance_template_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.coachId],
			foreignColumns: [user.id],
			name: "class_instance_coach_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "class_instance_class_type_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.trainingId],
			foreignColumns: [training.id],
			name: "class_instance_training_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.boxId],
			foreignColumns: [box.id],
			name: "class_instance_box_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	check("class_instance_time_order", sql`end_at > start_at`),
]);

export const authRealm = pgEnum("AuthRealm", ["member", "staff"]);

export const user = pgTable("user", {
 authRealm: authRealm("auth_realm").notNull(),
 authUserId: text("auth_user_id").notNull(),
 memberAuthId: text("member_auth_id").generatedAlwaysAs(sql`CASE WHEN auth_realm = 'member' THEN auth_user_id END`).references(() => memberAuthUser.id, { onDelete: 'restrict' }),
 staffAuthId: text("staff_auth_id").generatedAlwaysAs(sql`CASE WHEN auth_realm = 'staff' THEN auth_user_id END`).references(() => staffAuthUser.id, { onDelete: 'restrict' }),
	id: uuid().defaultRandom().primaryKey().notNull(),
	role: role().notNull(),
	status: userStatus().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	dni: text(),
	phone: text(),
	failedLogins: integer("failed_logins").default(0).notNull(),
	lockedUntil: timestamp("locked_until", { withTimezone: true, mode: 'date' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).notNull(),
	theme: userTheme().default('system').notNull(),
	paymentBoxId: uuid("payment_box_id"),
	preferenceBoxId: uuid("preference_box_id"),
}, (table) => [
	uniqueIndex("user_auth_identity").on(table.authRealm, table.authUserId),
 check("user_auth_role", sql`(auth_realm = 'member' AND role = 'member') OR (auth_realm = 'staff' AND role IN ('coach', 'admin'))`),
 index("user_payment_box_id_idx").using("btree", table.paymentBoxId.asc().nullsLast()),
	foreignKey({
			columns: [table.paymentBoxId],
			foreignColumns: [box.id],
			name: "user_payment_box_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.preferenceBoxId],
			foreignColumns: [box.id],
			name: "user_preference_box_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const training = pgTable("training", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	classTypeId: uuid("class_type_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).notNull(),
}, (table) => [
	index("training_class_type_id_idx").using("btree", table.classTypeId.asc().nullsLast()),
	foreignKey({
			columns: [table.classTypeId],
			foreignColumns: [classType.id],
			name: "training_class_type_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const classType = pgTable("class_type", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	kind: classKind().notNull(),
	imageKey: text("image_key"),
	slug: text().notNull(),
}, (table) => [
	uniqueIndex("class_type_slug_key").using("btree", table.slug.asc().nullsLast()),
]);

export const trainingPhase = pgTable("training_phase", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	trainingId: uuid("training_id").notNull(),
	name: text().notNull(),
	position: integer().notNull(),
}, (table) => [
	index("training_phase_training_id_idx").using("btree", table.trainingId.asc().nullsLast()),
	foreignKey({
			columns: [table.trainingId],
			foreignColumns: [training.id],
			name: "training_phase_training_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const trainingBlock = pgTable("training_block", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	phaseId: uuid("phase_id").notNull(),
	body: text().notNull(),
	position: integer().notNull(),
}, (table) => [
	index("training_block_phase_id_idx").using("btree", table.phaseId.asc().nullsLast()),
	foreignKey({
			columns: [table.phaseId],
			foreignColumns: [trainingPhase.id],
			name: "training_block_phase_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const userProfileImage = pgTable("user_profile_image", {
	userId: uuid("user_id").primaryKey().notNull(),
	mimeType: text("mime_type").notNull(),
	data: bytea("data").notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_profile_image_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const quotaAdjustment = pgTable("quota_adjustment", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	periodStart: date("period_start").notNull(),
	kind: classKind().notNull(),
	delta: integer().notNull(),
	note: text(),
	createdBy: uuid("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	period: quotaPeriod().default('week').notNull(),
}, (table) => [
	index("quota_adjustment_user_id_period_period_start_idx").using("btree", table.userId.asc().nullsLast(), table.period.asc().nullsLast(), table.periodStart.asc().nullsLast()),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "quota_adjustment_user_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [user.id],
			name: "quota_adjustment_created_by_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	check("quota_adjustment_delta_nonzero", sql`delta <> 0`),
]);

export const classTypeImage = pgTable("class_type_image", {
	id: text().primaryKey().notNull(),
	mimeType: text("mime_type").notNull(),
	data: bytea("data").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const box = pgTable("box", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	weeklyHours: jsonb("weekly_hours").notNull(),
	exceptions: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'date' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	slug: text().notNull(),
}, (table) => [
	uniqueIndex("box_name_key").using("btree", table.name.asc().nullsLast()),
	uniqueIndex("box_slug_key").using("btree", table.slug.asc().nullsLast()),
]);
