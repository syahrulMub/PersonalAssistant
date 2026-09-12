using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AIPersonalAssistant.Migrations
{
    /// <inheritdoc />
    public partial class AddUserWithDefaultValue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "AIRecaps",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "ActivityLogs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Email = table.Column<string>(type: "TEXT", nullable: false),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: false),
                    FullName = table.Column<string>(type: "TEXT", nullable: false),
                    IsApproved = table.Column<bool>(type: "INTEGER", nullable: false),
                    Role = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Users",
                columns: new[] { "Id", "CreatedAt", "Email", "FullName", "IsApproved", "PasswordHash", "Role" },
                values: new object[] { 1, new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "syahrul.mubarrok4@gmail.com", "Initial Admin", true, "$2a$11$PXqrFEWbIbSVGlFLoPeUQuGL.dTUiLTbY9tSJarop07xw9cc6132K", "Admin" });

            migrationBuilder.CreateIndex(
                name: "IX_AIRecaps_UserId",
                table: "AIRecaps",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ActivityLogs_UserId",
                table: "ActivityLogs",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ActivityLogs_Users_UserId",
                table: "ActivityLogs",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AIRecaps_Users_UserId",
                table: "AIRecaps",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ActivityLogs_Users_UserId",
                table: "ActivityLogs");

            migrationBuilder.DropForeignKey(
                name: "FK_AIRecaps_Users_UserId",
                table: "AIRecaps");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_AIRecaps_UserId",
                table: "AIRecaps");

            migrationBuilder.DropIndex(
                name: "IX_ActivityLogs_UserId",
                table: "ActivityLogs");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "AIRecaps");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ActivityLogs");
        }
    }
}
