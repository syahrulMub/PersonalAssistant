using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIPersonalAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AIMemoryForTrainingBehavior : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AIMemories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    MemoryType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Subject = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Key = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ValueJson = table.Column<string>(type: "TEXT", nullable: false),
                    Confidence = table.Column<double>(type: "REAL", nullable: false),
                    EvidenceCount = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Source = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    FirstObservedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastObservedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIMemories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIMemories_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AIMemoryObservations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    AIMemoryId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    SourceType = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    SourceId = table.Column<int>(type: "INTEGER", nullable: true),
                    ObservationValue = table.Column<string>(type: "TEXT", nullable: false),
                    Weight = table.Column<double>(type: "REAL", nullable: false),
                    ObservedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AIMemoryObservations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AIMemoryObservations_AIMemories_AIMemoryId",
                        column: x => x.AIMemoryId,
                        principalTable: "AIMemories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AIMemoryObservations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$mbkLOWYiFFMI8OOTLr7KQO4QkxDM9kZp1RizBUI6dlGWSk3ty/nwK");

            migrationBuilder.CreateIndex(
                name: "IX_AIMemories_UserId_Key",
                table: "AIMemories",
                columns: new[] { "UserId", "Key" });

            migrationBuilder.CreateIndex(
                name: "IX_AIMemories_UserId_Status",
                table: "AIMemories",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_AIMemories_UserId_Subject",
                table: "AIMemories",
                columns: new[] { "UserId", "Subject" });

            migrationBuilder.CreateIndex(
                name: "IX_AIMemoryObservations_AIMemoryId",
                table: "AIMemoryObservations",
                column: "AIMemoryId");

            migrationBuilder.CreateIndex(
                name: "IX_AIMemoryObservations_UserId",
                table: "AIMemoryObservations",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AIMemoryObservations");

            migrationBuilder.DropTable(
                name: "AIMemories");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$v8q7wU1aUQLdjm1v/55fL.4Q4naY4GYl.j2lkhc/cbJ/W/agx7.ue");
        }
    }
}
